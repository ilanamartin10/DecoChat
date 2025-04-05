# main.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
from dotenv import load_dotenv
import textwrap
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import sqlite3
from inputSql import generate_sql_from_input
import numpy as np
from google.cloud import vision
from openai import OpenAI
import base64
import io
from PIL import Image
import json

os.environ["TOKENIZERS_PARALLELISM"] = "false"

load_dotenv()

app = Flask(__name__)
CORS(app)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
vectorstore = FAISS.load_local("faiss_furniture_index", embeddings, allow_dangerous_deserialization=True)

chat = ChatGroq(
    temperature=0,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.2-90b-vision-preview"
)

sqlChat = ChatGroq(
    temperature=0,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.2-90b-vision-preview",
)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

system = (
    "You are a helpful IKEA furniture recommendation assistant. "
    "Your goal is to help users find the perfect furniture based on their needs and preferences. "
    "Engage in a conversational manner, keeping track of the user's queries and your responses within the current session. "
    "You can ask follow-up questions about their space, style preferences, budget, and specific needs to provide better recommendations. "
    "When answering follow-up questions, refer to previous exchanges to provide relevant context. "
    "In your responses, focus on the most relevant furniture items and explain why they might be a good fit. "
    "If a new question is unrelated to previous conversations, disregard previous context. "
    "Always be clear and concise in your responses, and format your recommendations in a bullet point format. "
    "Include key details like price, dimensions, and materials when relevant."
)

human = (
    "User query: '{query}'.\n"
    "Relevant matches from the database:\n"
    "{results}\n"
    "Use the matches to provide a conversational and context-aware response to the user."
)

prompt = ChatPromptTemplate.from_messages([("system", system), ("human", human)])

chain = prompt | chat

# Load and preprocess IKEA dataset
df = pd.read_csv('IKEA_SA_Furniture_Web_Scrapings_sss.csv')
# Create a combined description field for better search
df['description'] = df['name'] + ' - ' + df['short_description'].fillna('') + ' - ' + df['category']
# Clean up price data
df['price'] = pd.to_numeric(df['price'], errors='coerce')
# Create SQLite database
conn = sqlite3.connect('furniture.db')
df.to_sql('furniture', conn, index=False, if_exists='replace')
conn.close()

# Store conversation histories for different chats
conversation_histories = {}

def sanitize_metadata(metadata):
    """Recursively sanitize metadata by replacing invalid JSON values."""
    if isinstance(metadata, list):
        return [sanitize_metadata(item) for item in metadata]
    elif isinstance(metadata, dict):
        return {
            key: sanitize_metadata(value) for key, value in metadata.items()
        }
    elif isinstance(metadata, (float, int)) and np.isnan(metadata):
        return None 
    return metadata

@app.route('/api/chat', methods=['DELETE'])
def reset_chat():
    chat_id = request.args.get('chatId')
    if chat_id in conversation_histories:
        del conversation_histories[chat_id]
    return jsonify({'status': 'success'})

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get('message', '').strip()
    chat_id = data.get('chatId', 'default')
    
    if not user_input:
        return jsonify({'error': 'No message provided.'}), 400

    try:
        # Initialize conversation history for new chat
        if chat_id not in conversation_histories:
            conversation_histories[chat_id] = []

        is_follow_up = "follow-up" in user_input.lower() or (len(conversation_histories[chat_id]) > 0 and not user_input.lower().startswith(('new', 'reset', 'start over')))
        session_context = ""
        enriched_user_input = user_input

        if is_follow_up:
            session_context = "\n".join(
                f"User: {entry['query']}\nAssistant: {entry['response']}"
                for entry in conversation_histories[chat_id][-6:]
            )
            enriched_user_input = f"{session_context}\nUser: {user_input}"

        sql_query = generate_sql_from_input(enriched_user_input, sqlChat)

        print("Query is: ", sql_query)
    
        try:
            conn = sqlite3.connect('furniture.db')
            filtered_df = pd.read_sql_query(sql_query.content, conn)
            conn.close()

            texts = filtered_df["description"].tolist()
            metadata = filtered_df.drop(columns=["description"]).to_dict(orient="records")
            vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadata)
        except Exception as e:
            print(f"SQL query failed, using full dataset: {e}")
            texts = df["description"].tolist()
            metadata = df.drop(columns=["description"]).to_dict(orient="records")
            vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadata)

        enriched_query = enriched_user_input if is_follow_up else user_input
        search_results = vectorstore.similarity_search(enriched_query, k=5)

        metadata_results = [sanitize_metadata(result.metadata) for result in search_results]

        formatted_results = "\n".join(
            f"{i+1}. {result.page_content}"
            for i, result in enumerate(search_results)
        )

        response = chain.invoke({
            "query": enriched_user_input,
            "results": formatted_results
        })

        conversation_histories[chat_id].append({
            "query": user_input,
            "response": response.content
        })

        print(f"\nAssistant: {response.content}")

        response_data = {
            'response': response.content,
            'metadata': metadata_results
        }

        return jsonify(response_data)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# Initialize Google Cloud Vision client
vision_client = vision.ImageAnnotatorClient()

# Initialize Groq client for furniture analysis
furnitureChat = ChatGroq(
    temperature=0.7,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.2-90b-vision-preview"
)

@app.route('/api/analyze-furniture', methods=['POST'])
def analyze_furniture():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
            
        print("Received image data, length:", len(data['image']))
        
        try:
            image_data = base64.b64decode(data['image'])
            print("Successfully decoded base64 image")
        except Exception as e:
            print(f"Error decoding base64: {str(e)}")
            return jsonify({'error': 'Invalid image data'}), 400
        
        try:
            # Create Vision API image
            image = vision.Image(content=image_data)
            print("Created Vision API image object")
            
            # Perform label detection
            response = vision_client.label_detection(image=image)
            labels = [label.description for label in response.label_annotations]
            print("Detected labels:", labels)
            
            # Perform object detection
            objects_response = vision_client.object_localization(image=image)
            objects = [obj.name for obj in objects_response.localized_object_annotations]
            print("Detected objects:", objects)
            
            # Combine labels and objects for better context
            furniture_context = " ".join(set(labels + objects))
            print("Combined context:", furniture_context)
            
        except Exception as e:
            print(f"Error with Vision API: {str(e)}")
            return jsonify({'error': f'Vision API error: {str(e)}'}), 500
        
        try:
            # Generate care guide using Groq
            prompt = f"""Based on the following furniture context: {furniture_context}

Please provide a concise care guide with the following sections (keep each section to 1-2 sentences):

1. Materials: Briefly identify the main materials
2. Cleaning Tips: Provide 1-2 key cleaning instructions
3. Maintenance Schedule: List 2-3 main maintenance tasks

IMPORTANT: Your response MUST be a valid JSON object with EXACTLY these keys:
{{
    "materials": "brief materials description",
    "cleaningTips": "1-2 key cleaning tips",
    "maintenanceSchedule": "2-3 main maintenance tasks"
}}

Keep responses short and to the point. Do not include any additional text or formatting outside the JSON object."""

            print("Sending request to Groq...")
            response = furnitureChat.invoke(prompt)
            print("Received response from Groq")
            print("Raw response:", response.content)
            
            try:
                # Try to clean the response if it's not pure JSON
                content = response.content.strip()
                if not content.startswith('{'):
                    # Find the first { and last }
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    if start != -1 and end != 0:
                        content = content[start:end]
                
                care_guide = json.loads(content)
                print("Successfully parsed care guide")
                
                # Validate the required keys are present
                required_keys = ['materials', 'cleaningTips', 'maintenanceSchedule']
                if not all(key in care_guide for key in required_keys):
                    raise ValueError("Missing required keys in response")
                
                return jsonify(care_guide)
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {str(e)}")
                print("Raw content that failed to parse:", response.content)
                return jsonify({'error': 'Failed to parse response from AI'}), 500
            except ValueError as e:
                print(f"Validation error: {str(e)}")
                return jsonify({'error': str(e)}), 500
            
        except Exception as e:
            print(f"Error with Groq: {str(e)}")
            return jsonify({'error': f'Groq error: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
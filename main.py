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

@app.route('/api/analyze-moodboard', methods=['POST'])
def analyze_moodboard():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        if not image_file.filename:
            return jsonify({'error': 'No image selected'}), 400

        # Ensure uploads directory exists
        uploads_dir = 'uploads'
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)

        # Save the image temporarily
        temp_path = os.path.join(uploads_dir, 'temp_moodboard.jpg')
        try:
            image_file.save(temp_path)
        except Exception as e:
            return jsonify({'error': f'Failed to save image: {str(e)}'}), 500

        # Initialize Google Vision API client
        try:
            client = vision.ImageAnnotatorClient()
        except Exception as e:
            return jsonify({'error': f'Failed to initialize Vision API client: {str(e)}'}), 500

        # Read the image file
        try:
            with open(temp_path, 'rb') as image_file:
                content = image_file.read()
        except Exception as e:
            return jsonify({'error': f'Failed to read image file: {str(e)}'}), 500

        image = vision.Image(content=content)
        
        # Perform image analysis
        try:
            response = client.label_detection(image=image)
            labels = [label.description for label in response.label_annotations]
            
            # Get image properties
            response = client.image_properties(image=image)
            colors = []
            for color in response.image_properties_annotation.dominant_colors.colors:
                colors.append({
                    'red': color.color.red,
                    'green': color.color.green,
                    'blue': color.color.blue,
                    'score': color.score
                })
        except Exception as e:
            return jsonify({'error': f'Failed to analyze image: {str(e)}'}), 500

        # Connect to IKEA database
        try:
            conn = sqlite3.connect('furniture.db')
            cursor = conn.cursor()
        except Exception as e:
            return jsonify({'error': f'Failed to connect to database: {str(e)}'}), 500

        # Generate room vibe description and furniture recommendations
        try:
            prompt = f"""
            Based on the following image analysis:
            - Labels: {', '.join(labels)}
            - Dominant colors: {json.dumps(colors)}
            
            Please provide:
            1. A brief description of the room's vibe and style
            2. 3-5 furniture categories that would complement this space. 
               IMPORTANT: Use ONLY these exact categories from our database:
               - Bar furniture
               - Beds
               - Bookcases & shelving units
               - Cabinets & cupboards
               - Café furniture
            
            Format the response as a JSON object with the following structure:
            {{
                "vibe": "description of the room's vibe",
                "categories": ["category1", "category2", "category3"]
            }}
            """

            response = chat.invoke(prompt)
            analysis = json.loads(response.content)
            print("Generated categories:", analysis['categories'])  # Debug log
        except Exception as e:
            return jsonify({'error': f'Failed to generate recommendations: {str(e)}'}), 500
        
        # Get recommendations from IKEA database
        recommendations = []
        try:
            # First, let's check what categories exist in the database
            cursor.execute("SELECT DISTINCT category FROM furniture")
            existing_categories = [row[0] for row in cursor.fetchall()]
            print("Existing categories in DB:", existing_categories)  # Debug log

            for category in analysis['categories']:
                print(f"Searching for category: {category}")  # Debug log
                # Try exact match first
                cursor.execute("""
                    SELECT name, short_description, price, link 
                    FROM furniture 
                    WHERE category = ?
                    ORDER BY RANDOM() 
                    LIMIT 1
                """, (category,))
                
                result = cursor.fetchone()
                if not result:
                    # If no exact match, try partial match
                    cursor.execute("""
                        SELECT name, short_description, price, link 
                        FROM furniture 
                        WHERE category LIKE ?
                        ORDER BY RANDOM() 
                        LIMIT 1
                    """, (f'%{category}%',))
                    result = cursor.fetchone()

                if result:
                    name, description, price, link = result

                    recommendations.append({
                        'name': name,
                        'description': f"{description} (Price: {price})",
                        'link': link
                    })
                    print(f"Found match: {name} with link: {link}")  # Debug log
                else:
                    print(f"No match found for category: {category}")  # Debug log

            print(f"Total recommendations found: {len(recommendations)}")  # Debug log
        except Exception as e:
            return jsonify({'error': f'Failed to query database: {str(e)}'}), 500

        conn.close()

        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass  # Ignore cleanup errors

        return jsonify({
            'vibe': analysis['vibe'],
            'recommendations': recommendations
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/furniture-categories', methods=['GET'])
def get_furniture_categories():
    try:
        conn = sqlite3.connect('furniture.db')
        cursor = conn.cursor()
        
        # Get unique categories
        cursor.execute("SELECT DISTINCT category FROM furniture")
        categories = [row[0] for row in cursor.fetchall()]
        
        return jsonify({'categories': categories})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/furniture-items/<category>', methods=['GET'])
def get_furniture_items(category):
    try:
        conn = sqlite3.connect('furniture.db')
        cursor = conn.cursor()
        
        # Get furniture items for the selected category that have all measurements
        cursor.execute("""
            SELECT name, width, height, depth, short_description 
            FROM furniture 
            WHERE category = ? 
            AND width IS NOT NULL 
            AND height IS NOT NULL 
            AND depth IS NOT NULL
        """, (category,))
        
        items = []
        for row in cursor.fetchall():
            name, width, height, depth, description = row
            items.append({
                'name': name,
                'width': width,
                'height': height,
                'depth': depth,
                'description': description
            })
        
        return jsonify({'items': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
import pandas as pd
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

csv_file = "IKEA_SA_Furniture_Web_Scrapings_sss.csv"
df = pd.read_csv(csv_file)

def create_detailed_description(row):
    # Handle price information
    if pd.isnull(row['price']):
        price_info = "Price not available"
    else:
        price_info = f"Price: ${row['price']}"
        if pd.notnull(row['old_price']) and row['old_price'] != "No old price":
            price_info += f" (Was ${row['old_price']})"

    # Handle dimensions
    dimensions = []
    if pd.notnull(row['depth']):
        dimensions.append(f"Depth: {row['depth']}cm")
    if pd.notnull(row['height']):
        dimensions.append(f"Height: {row['height']}cm")
    if pd.notnull(row['width']):
        dimensions.append(f"Width: {row['width']}cm")
    dimensions_str = " | ".join(dimensions) if dimensions else "Dimensions not specified"

    # Handle availability
    availability = "Available online" if row['sellable_online'] else "Not available online"
    if row['other_colors'] == "Yes":
        availability += " | Available in other colors"

    # Handle designer information
    designer_info = f"Designed by {row['designer']}" if pd.notnull(row['designer']) else ""

    description = (
        f"{row['name']} - {row['category']}\n"
        f"{row['short_description']}\n"
        f"{price_info}\n"
        f"{dimensions_str}\n"
        f"{availability}\n"
        f"{designer_info}"
    )
    return description.strip()

# Create the detailed description column
df["description"] = df.apply(create_detailed_description, axis=1)

# Clean up price data
df['price'] = pd.to_numeric(df['price'], errors='coerce')

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

# Prepare data for vector store
texts = df["description"].tolist()
metadata = df.drop(columns=["description"]).to_dict(orient="records")
ids = df.index.astype(str).tolist()

# Create and save vector store
vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadata, ids=ids)
vectorstore.save_local("faiss_furniture_index")

print("Embeddings generated and saved successfully!")
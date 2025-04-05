from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

system = """You are a SQL query generator for an IKEA furniture database. 
The database has the following columns:
- item_id: unique identifier
- name: product name
- category: furniture category (e.g., 'Bar furniture', 'Sofas', 'Tables')
- price: product price
- old_price: previous price if on sale
- sellable_online: boolean indicating if item can be bought online
- link: product URL
- other_colors: boolean indicating if other colors are available
- short_description: brief product description
- designer: product designer
- depth: product depth in cm
- height: product height in cm
- width: product width in cm

Generate SQL queries that:
1. Filter based on user preferences and requirements
2. Consider price ranges, categories, and dimensions
3. Include relevant product details
4. Handle both specific and vague queries
5. Use LIKE for text searches to handle partial matches
6. Always include the description field in the results

Example queries:
- For a budget sofa: "SELECT * FROM furniture WHERE category LIKE '%Sofa%' AND price <= 500"
- For a specific size table: "SELECT * FROM furniture WHERE category LIKE '%Table%' AND width >= 100 AND width <= 150"
- For a designer piece: "SELECT * FROM furniture WHERE designer LIKE '%Hansen%'"

Always return valid SQL that can be executed directly."""

human = "{input}"

prompt = ChatPromptTemplate.from_messages([("system", system), ("human", human)])

def generate_sql_from_input(user_input, llm):
    chain = prompt | llm
    response = chain.invoke({"input": user_input})
    return response 
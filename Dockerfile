# Use the official slim Python 3.10 image as the base
FROM python:3.10-slim

# Install Node.js prerequisites and Node.js itself
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy your frontend and backend code into the container
COPY frontend ./frontend
COPY backend ./backend

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Install backend dependencies
WORKDIR /app/backend
RUN pip3 install --no-cache-dir -r requirements.txt

# Generate embeddings if needed
WORKDIR /app
RUN python3 ./backend/generate_embeddings.py

# Copy the startup script and make it executable
WORKDIR /app
COPY start.sh .
RUN chmod +x start.sh

# Expose both the frontend and backend ports
EXPOSE 3000 8000

CMD ["./start.sh"]
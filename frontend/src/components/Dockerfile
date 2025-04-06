FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .
RUN python3 generate_embeddings.py

EXPOSE 8000

CMD ["python3", "main.py"]
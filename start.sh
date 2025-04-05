#!/bin/bash
# Start the Flask backend in the background
cd /app/backend
python3 main.py &

# Change directory to the frontend and start the React development server
cd /app/frontend
npm start


#!/bin/bash

echo "==========================================="
echo "Event Check-in Management System"
echo "Frontend Application"
echo "==========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

echo "Starting development server..."
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo ""
echo "Make sure the backend is running at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

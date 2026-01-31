#!/bin/bash

# Event Check-in Management System - Backend Startup Script

echo "========================================="
echo "Event Check-in Management System"
echo "Backend Server"
echo "========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  WARNING: Please update .env with your configuration!"
    echo "   Especially change the SECRET_KEY for security."
    echo ""
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo "Creating data directory..."
    mkdir -p data/events
fi

echo ""
echo "========================================="
echo "Starting Backend Server..."
echo "========================================="
echo ""
echo "API will be available at: http://localhost:8000"
echo "API Documentation at: http://localhost:8000/docs"
echo ""
echo "Default credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

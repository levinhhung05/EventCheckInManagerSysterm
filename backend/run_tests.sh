#!/bin/bash

echo "Running Event Check-in Management System Tests"
echo "=============================================="
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run pytest with coverage
pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

echo ""
echo "=============================================="
echo "Coverage report generated in htmlcov/index.html"

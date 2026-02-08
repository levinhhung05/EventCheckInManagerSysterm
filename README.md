# Event Check-in Manager

A real-time event management system - simple, powerful, and easy to use.

## 🚀 Quick Start

### 1. Backend Setup (Python)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup (Node.js)

```bash
cd frontend
npm install
npm run dev -- --host
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 👤 Default Accounts

**Admin**: 
- Email: `admin@example.com`
- Password: `admin123`

## 💡 Key Features

- **Event Management**: Create and manage multiple events
- **Real-time Check-in**: Instant updates across all devices
- **Drag & Drop Layout**: Visual seating arrangement designer
- **Guest Import**: Bulk import guests from CSV files
- **Live Reports**: Real-time check-in analytics and reporting

## 🛠 Technology Stack

**Backend**: FastAPI, Socket.IO, Python  
**Frontend**: React, Chakra UI, Socket.IO Client  
**Database**: JSON files (no external database required)

## 📁 Project Structure

```
/backend/    → Python API server
/frontend/   → React application
```

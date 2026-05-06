# 🩺 AI-First CRM for Healthcare Professionals (HCPs)

An intelligent, real-time Customer Relationship Management (CRM) system designed specifically for Medical Representatives. Instead of manually filling out tedious forms, representatives can simply chat with the AI to log meetings, schedule follow-ups, and get instant insights into doctor preferences.

---

## 🚀 Features

- **Conversational Data Entry**: Chat naturally with the AI to log calls and in-person meetings.
- **Smart Corrections**: Correct previous logs using natural language (e.g., *"Wait, I meant Dr. Smith, not Dr. Akshay."*).
- **Real-Time Synchronization**: A split-screen dashboard that updates instantly via WebSockets the moment the AI saves a record.
- **AI Doctor Insights**: Ask the AI questions about a doctor's history or preferences, and it will analyze past interactions to give you a summary.
- **Manual Fallback**: A traditional form is available alongside the AI for quick, manual entries.

---

## 🛠️ Technology Stack

### **Frontend**
- **React.js (Vite)**: Lightning-fast UI rendering.
- **Tailwind CSS**: Premium, responsive, and modern styling.
- **Redux Toolkit**: State management for chat history and active data.

### **Backend**
- **FastAPI**: High-performance Python backend.
- **WebSockets & BackgroundTasks**: For real-time, non-blocking UI updates.
- **SQLite + SQLAlchemy**: Lightweight, persistent relational database management.

### **AI & Orchestration**
- **LangChain & LangGraph**: State-machine orchestration for tool-calling and conversation flow.
- **Groq (Llama 3.1)**: Ultra-fast LLM inference for natural language processing.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Groq API Key

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy langchain-groq langgraph pydantic python-dotenv websockets
   ```
4. Create a `.env` file in the `backend/` directory and add your Groq API Key:
   ```env
   GROQ_API_KEY=your_api_key_here
   ```
5. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the link provided in the terminal (usually `http://localhost:5173`) in your browser.

---

## 📘 How to Use the CRM

### 1. Logging an Interaction (The AI Way)
1. Go to the **Log Interaction** tab.
2. In the chat box, type something like: 
   > *"I met with Dr. Enakshi today. She asked for more samples of Amoxicillin and wants to see the pricing sheet for next quarter."*
3. The AI will extract the doctor's name, products discussed, and the intent. It will natively call the `save_new_meeting` tool.
4. **Watch the magic**: The moment the AI says "Saved," the **History Dashboard** will update instantly.

### 2. Correcting a Log
Made a mistake? Just tell the AI!
- > *"Actually, I met Dr. Enakshi yesterday, not today. And we discussed Metformin, not Amoxicillin."*
- The AI will trigger the `edit_interaction` tool, backdate the meeting, update the products, and re-generate a new summary for the dashboard.

### 3. Getting Insights
Want to prepare for a meeting?
- > *"What are Dr. Enakshi's main concerns based on our past meetings?"*
- The AI will scan the database history and provide a bulleted summary of her preferences without creating a new log entry.

---

## 🔄 System Architecture & Workflow

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant ReactUI as Frontend (React)
    participant FastAPI as Backend (FastAPI)
    participant Agent as LangGraph Agent
    participant LLM as Groq (Llama 3.1)
    participant DB as SQLite DB

    User->>ReactUI: "Met Dr. Smith today..."
    ReactUI->>FastAPI: POST /chat (Message)
    FastAPI->>Agent: process_chat()
    Agent->>LLM: Analyze intent & extract entities
    LLM-->>Agent: Function Call: save_new_meeting()
    Agent->>DB: INSERT INTO interactions
    DB-->>Agent: Success
    Agent-->>FastAPI: "Successfully saved the meeting."
    FastAPI--)ReactUI: WebSocket Broadcast ("update")
    FastAPI-->>ReactUI: Return Chat Response
    ReactUI->>FastAPI: GET /interactions (Triggered by WebSocket)
    FastAPI-->>ReactUI: Fresh Data Array
    ReactUI-->>User: Dashboard visually updates instantly
```

### Database Schema
The system uses a persistent database (default: SQLite `backend/hcp.db`). 
- **`id`**: Primary Key
- **`doctor_name`**: String
- **`interaction_date`**: DateTime (When the meeting occurred)
- **`interaction_type`**: String (In-person, Call, Email)
- **`notes`**: Text (Raw notes from the MR)
- **`products`**: String (Extracted products)
- **`summary`**: Text (AI-generated brief)
- **`action_items`**: Text (AI-extracted next steps)
- **`follow_up_date`**: DateTime (If scheduled)

### 🗄️ Migrating to MySQL or PostgreSQL (Assignment Requirement)
Because the backend uses **SQLAlchemy**, switching to a production database requires zero changes to the core code.

**To use MySQL:**
1. Install the driver: `pip install pymysql cryptography`
2. Add this to your `.env` file:
   ```env
   DATABASE_URL=mysql+pymysql://username:password@localhost:3306/your_db_name
   ```

**To use PostgreSQL:**
1. Install the driver: `pip install psycopg2`
2. Add this to your `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/your_db_name
   ```
*Upon restarting the server (`uvicorn main:app`), SQLAlchemy will automatically connect to your new database and build the tables from scratch.*

---

## 🛡️ Stability, Fallbacks & Diagnostics

- **Intelligent Database Fallback**: The system now automatically detects if a production database (like Supabase) is unreachable and gracefully falls back to a local SQLite instance (`hcp.db`). This ensures the CRM never crashes during a demo.
- **Diagnostic Tool**: A new health-check script is available. Run it to verify your API keys and database connectivity:
  ```bash
  python backend/diagnose.py
  ```
- **Real-Time WebSocket Sync**: We've added robust connection logging and auto-refresh logic. The frontend now monitors the WebSocket state and triggers a full data fetch whenever a change is detected, ensuring the dashboard is always 100% accurate.
- **Bulletproof Parsing**: If the LLM generates malformed JSON or broken XML tags, a custom RegEx fallback parser ensures the data is salvaged and saved anyway.

---

## 📦 Version Control & Deployment

The project is synchronized with GitHub. To push the latest stable changes:
```bash
git add .
git commit -m "Stable: Final demo ready with robust DB fallback"
git push origin main
```

**Remote Repository**: [AI-powered-CRM-for-Medical-Representative](https://github.com/kavikbir/AI-powered-CRM-for-Medical-Representative.git)

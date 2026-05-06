import os
import sys
from dotenv import load_dotenv

# Ensure the backend directory is in the path for Vercel
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Response, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
import schemas
import database
import agent
from typing import List

# --- REAL-TIME WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()
# -----------------------------------

try:
    print(f"Connecting to database: {database.DATABASE_URL.split('@')[-1] if '@' in database.DATABASE_URL else database.DATABASE_URL}")
    models.Base.metadata.create_all(bind=database.engine)
    print("✅ Database synchronized successfully.")
except Exception as e:
    print(f"❌ Database connection failed: {e}")

app = FastAPI(
    title="AI-First CRM HCP Module"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-First CRM API", "status": "running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ai_provider": "groq"
    }

@app.get("/interactions", response_model=List[schemas.InteractionResponse])
def get_interactions(response: Response, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    interactions = db.query(models.Interaction).offset(skip).limit(limit).all()
    return interactions

@app.post("/interactions", response_model=schemas.InteractionResponse)
def create_interaction(interaction: schemas.InteractionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        result = agent.save_new_meeting.invoke({
            "doctor_name": interaction.doctor_name,
            "interaction_type": interaction.interaction_type,
            "notes": interaction.notes,
            "products": interaction.products,
            "follow_up_date": interaction.follow_up_date
        })
        db_interaction = db.query(models.Interaction).filter(
            models.Interaction.doctor_name == interaction.doctor_name
        ).order_by(models.Interaction.id.desc()).first()
        background_tasks.add_task(manager.broadcast, "update")
        return db_interaction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/interactions/{interaction_id}", response_model=schemas.InteractionResponse)
def update_interaction(interaction_id: int, interaction: schemas.InteractionUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if interaction.notes:
        agent.edit_interaction.invoke({
            "interaction_id": interaction_id,
            "new_notes": interaction.notes
        })
    db_interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.doctor_name:
        db_interaction.doctor_name = interaction.doctor_name
    if interaction.interaction_type:
        db_interaction.interaction_type = interaction.interaction_type
    if interaction.products:
        db_interaction.products = interaction.products
    if interaction.follow_up_date:
        db_interaction.follow_up_date = interaction.follow_up_date
        
    db.commit()
    db.refresh(db_interaction)
    background_tasks.add_task(manager.broadcast, "update")
    return db_interaction

@app.post("/chat", response_model=schemas.AgentResponse)
def chat_with_agent(chat_message: schemas.ChatMessage, background_tasks: BackgroundTasks):
    try:
        result = agent.process_chat(chat_message.message, chat_message.thread_id)
        background_tasks.add_task(manager.broadcast, "update")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

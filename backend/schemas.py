from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InteractionBase(BaseModel):
    doctor_name: str
    interaction_type: str
    notes: str
    products: Optional[str] = None
    follow_up_date: Optional[str] = None

class InteractionCreate(InteractionBase):
    pass

class InteractionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    interaction_type: Optional[str] = None
    notes: Optional[str] = None
    products: Optional[str] = None
    follow_up_date: Optional[str] = None

class InteractionResponse(InteractionBase):
    id: int
    interaction_date: datetime
    created_at: datetime
    summary: Optional[str] = None
    action_items: Optional[str] = None

    class Config:
        orm_mode = True

class ChatMessage(BaseModel):
    message: str
    thread_id: str

class AgentResponse(BaseModel):
    response: str
    extracted_data: Optional[dict] = None

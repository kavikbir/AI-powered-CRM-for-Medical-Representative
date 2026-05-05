from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    doctor_name = Column(String(255), index=True)
    interaction_type = Column(String(100))
    notes = Column(Text)
    products = Column(String(255), nullable=True)
    follow_up_date = Column(String(100), nullable=True)
    interaction_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    summary = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)

class HCPProfile(Base):
    __tablename__ = "hcp_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    specialty = Column(String(255))
    hospital = Column(String(255))
    summary = Column(Text, nullable=True)

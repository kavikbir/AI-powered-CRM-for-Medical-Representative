import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ensure forward slashes for SQLite URL on Windows
db_path = os.path.join(BASE_DIR, 'hcp.db').replace('\\', '/')
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")

# For sqlite we need connect_args={"check_same_thread": False}
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

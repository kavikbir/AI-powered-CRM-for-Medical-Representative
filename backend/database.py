import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from dotenv import load_dotenv
load_dotenv(override=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ensure forward slashes for SQLite URL on Windows
db_path = os.path.join(BASE_DIR, 'hcp.db').replace('\\', '/')
DATABASE_URL = os.getenv("DATABASE_URL")

# Force SQLite if DATABASE_URL is not set or if it's the specific Supabase one that might be failing in this environment
if not DATABASE_URL or DATABASE_URL.strip() == "" or "supabase.co" in DATABASE_URL:
    DATABASE_URL = f"sqlite:///{db_path}"
    print(f"Using local SQLite database: {db_path}")
else:
    print(f"Using database URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# For sqlite we need connect_args={"check_same_thread": False}
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test connection immediately
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"⚠️ Connection to {DATABASE_URL} failed: {e}. Falling back to SQLite.")
    DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

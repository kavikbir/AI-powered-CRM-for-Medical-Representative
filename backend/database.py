import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from dotenv import load_dotenv
load_dotenv(override=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# On Vercel, the directory is read-only. Fall back to /tmp for SQLite database file if running on Vercel.
if os.getenv("VERCEL"):
    db_path = "/tmp/hcp.db"
else:
    db_path = os.path.join(BASE_DIR, 'hcp.db').replace('\\', '/')
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix Heroku/Supabase postgres:// to postgresql:// scheme (required by SQLAlchemy 1.4+)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Use SQLite fallback if DATABASE_URL is not set
if not DATABASE_URL or DATABASE_URL.strip() == "":
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

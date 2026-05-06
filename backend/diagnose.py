import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def test_groq():
    print("Testing Groq API...")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ GROQ_API_KEY not found in .env")
        return
    
    from langchain_groq import ChatGroq
    try:
        llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=api_key)
        response = llm.invoke("Hello")
        print(f"✅ Groq API working. Response: {response.content[:20]}...")
    except Exception as e:
        print(f"❌ Groq API failed: {e}")

def test_db():
    print("Testing Database connection...")
    import database
    from sqlalchemy import text
    try:
        engine = database.engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Database connection working. URL: {database.DATABASE_URL}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == "__main__":
    test_groq()
    test_db()

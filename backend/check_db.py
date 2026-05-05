import sqlite3
import os

db_path = r'c:\Users\HP\Desktop\HCP\backend\hcp.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    if ('interactions',) in tables:
        cursor.execute("SELECT COUNT(*) FROM interactions;")
        count = cursor.fetchone()[0]
        print(f"Interactions count: {count}")
    else:
        print("Interactions table not found.")
    conn.close()
else:
    print("Database file not found.")

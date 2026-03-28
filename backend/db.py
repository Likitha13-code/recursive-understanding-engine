import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    conn = psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=psycopg2.extras.RealDictCursor
    )
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL,
            query        TEXT NOT NULL,
            session_data TEXT NOT NULL,
            bookmarked   BOOLEAN DEFAULT FALSE,
            created_at   TEXT NOT NULL,
            updated_at   TEXT NOT NULL
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

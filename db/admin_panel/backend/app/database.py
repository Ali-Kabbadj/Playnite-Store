import os
from typing import Any
from dotenv import load_dotenv
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

load_dotenv()
DB_DSN = os.environ.get('DB_DSN', '')

pool = ThreadedConnectionPool(1, 20, DB_DSN)

@contextmanager
def get_db_connection():
    conn = pool.getconn()
    try:
        conn.autocommit = True
        yield conn
    finally:
        pool.putconn(conn)

@contextmanager
def get_db_cursor(cursor_factory: Any = RealDictCursor):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=cursor_factory) as cur:
            yield cur
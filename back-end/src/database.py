import logging

from psycopg2 import pool
from src.config import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

logger = logging.getLogger(__name__)

# --- CONNECTION POOL ---
# min=5, max=20 connections
try:
    connection_pool = pool.ThreadedConnectionPool(
        5, 20,
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
except Exception as e:
    logger.critical("FATAL: Could not connect to database: %s", e)
    raise e

def get_db_connection():
    return connection_pool.getconn()

def release_db_connection(conn):
    connection_pool.putconn(conn)

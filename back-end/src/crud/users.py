import logging
from psycopg2 import errors
from src.database import get_db_connection, release_db_connection
from src.auth_utils import hash_password, verify_password

logger = logging.getLogger(__name__)

def create_user(full_name, email, raw_password):
    """
    Creates a new user and safely handles unique constraints.
    Returns the complete user dictionary for Pydantic validation, or an error code.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    hashed_pwd = hash_password(raw_password)
    
    # We now request the DB to return all fields needed by the Pydantic UserResponse schema
    query = """
        INSERT INTO users (full_name, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING id, full_name, email, plan, role, created_at;
    """

    try:
        cursor.execute(query, (full_name, email, hashed_pwd))
        user_record = cursor.fetchone()
        conn.commit()

        return {
            "id": str(user_record[0]),
            "full_name": user_record[1],
            "email": user_record[2],
            "plan": user_record[3],
            "role": user_record[4],
            "created_at": user_record[5].isoformat() if user_record[5] else None,
        }
        
    except errors.UniqueViolation:
        conn.rollback()
        return {"error": "email_exists"}

    except Exception as e:
        logger.error("Error creating user: %s", e)
        conn.rollback()
        return {"error": "database_error"}
        
    finally:
        cursor.close()
        release_db_connection(conn)
    
def authenticate_user(email, password):
    """Verifies user credentials using the connection pool."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT id, full_name, email, password_hash, plan, role, created_at FROM users WHERE email = %s;"

    try:
        cursor.execute(query, (email,))
        user_record = cursor.fetchone()
        if user_record:
            user_id, full_name, user_email, hashed_pwd, plan, role, created_at = user_record
            if verify_password(password, hashed_pwd):
                return {
                    "id": str(user_id),
                    "full_name": full_name,
                    "email": user_email,
                    "plan": plan,
                    "role": role,
                    "created_at": created_at.isoformat() if created_at else None,
                }
        return None
    finally:
        cursor.close()
        release_db_connection(conn)

def update_user(user_id: str, update_data: dict):
    """Updates user profile fields dynamically."""
    conn = get_db_connection()
    cursor = conn.cursor()
    fields = ", ".join([f"{k} = %s" for k in update_data.keys()])
    values = list(update_data.values())
    values.append(user_id)
    query = f"UPDATE users SET {fields} WHERE id = %s RETURNING full_name;"
    try:
        cursor.execute(query, tuple(values))
        conn.commit()
        row = cursor.fetchone()
        return {"full_name": row[0]} if row else None
    finally:
        cursor.close()
        release_db_connection(conn)
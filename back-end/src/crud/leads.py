import logging
from psycopg2 import errors
from src.database import get_db_connection, release_db_connection


logger = logging.getLogger(__name__)

def create_lead(user_id: str, lead_data):
    """Saves a new lead using the connection pool."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        INSERT INTO leads (user_id, full_name, phone, email, status, source)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
    """
    try:
        cursor.execute(query, (user_id, lead_data.full_name, lead_data.phone, lead_data.email, lead_data.status.value, lead_data.source.value))
        lead_id = cursor.fetchone()[0]
        conn.commit()
        return str(lead_id)
    finally:
        cursor.close()
        release_db_connection(conn)

def get_lead_by_id(lead_id: str, user_id: str):
    """Fetches a single lead, ensuring it belongs to the requesting user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM leads WHERE id = %s AND user_id = %s;"
    try:
        cursor.execute(query, (lead_id, user_id))
        row = cursor.fetchone()
        if not row: return None
        columns = [desc[0] for desc in cursor.description]
        lead = dict(zip(columns, row))
        lead['id'] = str(lead['id'])
        return lead
    finally:
        cursor.close()
        release_db_connection(conn)

def update_lead(lead_id: str, user_id: str, update_data: dict):
    """Updates lead fields dynamically."""
    if not update_data: return False
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Building dynamic SQL: SET key1=%s, key2=%s...
    fields = ", ".join([f"{k} = %s" for k in update_data.keys()])
    values = list(update_data.values())
    values.extend([lead_id, user_id])
    
    query = f"UPDATE leads SET {fields}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s;"
    try:
        cursor.execute(query, tuple(values))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        release_db_connection(conn)

def delete_lead(lead_id: str, user_id: str):
    """Permanently deletes a lead."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "DELETE FROM leads WHERE id = %s AND user_id = %s;"
    try:
        cursor.execute(query, (lead_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        release_db_connection(conn)

def get_leads_by_user(user_id: str, limit: int = 50, offset: int = 0):
    """
    Fetches leads with PAGINATION (LIMIT and OFFSET).
    This prevents memory issues with large datasets.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, full_name, phone, email, status, source, created_at
        FROM leads
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s;
    """
    
    try:
        cursor.execute(query, (user_id, limit, offset))
        columns = [desc[0] for desc in cursor.description]
        leads = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        for lead in leads:
            lead['id'] = str(lead['id'])
            if lead['created_at']:
                lead['created_at'] = lead['created_at'].isoformat()
        return leads
    finally:
        cursor.close()
        release_db_connection(conn)
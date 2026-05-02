import logging

import psycopg2.extras
from psycopg2 import pool, errors
from src.auth_utils import hash_password, verify_password
from src.config import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

logger = logging.getLogger(__name__)

# --- CONNECTION POOLING SETUP ---
# We initialize a pool with 5 min and 20 max connections
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

# --- USER FUNCTIONS ---

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

# --- LEAD FUNCTIONS (WITH PAGINATION) ---

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

def get_stats(user_id: str, start_date: str = None, end_date: str = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        date_filter = ""
        params = [user_id]
        
        if start_date and end_date:
            date_filter = "AND created_at >= %s AND created_at <= %s"
            params.extend([start_date, end_date])
            
        # 1. KPIs: total, new, converted and conversion rate
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
                SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_leads
            FROM leads WHERE user_id = %s {date_filter}
        """, tuple(params))
        kpis = cursor.fetchone()

        # 2. Pipeline funnel grouped by status
        cursor.execute(f"""
            SELECT status as name, COUNT(*) as value 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY status ORDER BY value DESC
        """, tuple(params))
        funnel = cursor.fetchall()

        # 3. Lead source distribution
        cursor.execute(f"""
            SELECT source as name, COUNT(*) as value 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY source ORDER BY value DESC
        """, tuple(params))
        sources = cursor.fetchall()

        # 4. Leads over time grouped by day
        cursor.execute(f"""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM leads WHERE user_id = %s {date_filter}
            GROUP BY DATE(created_at) ORDER BY date ASC
        """, tuple(params))
        chart = cursor.fetchall()

        for row in chart:
            row['date'] = str(row['date'])

        total = kpis['total_leads'] or 0
        converted = kpis['converted_leads'] or 0
        conversion_rate = round((converted / total * 100), 1) if total > 0 else 0

        return {
            "kpis": {
                "total": total,
                "new": kpis['new_leads'] or 0,
                "converted": converted,
                "conversion_rate": conversion_rate
            },
            "funnel": funnel,
            "sources": sources,
            "chart": chart
        }
    finally:
        cursor.close()
        release_db_connection(conn)
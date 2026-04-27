import psycopg2
from psycopg2 import pool, errors
from src.auth_utils import hash_password, verify_password
from src.config import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

# --- CONNECTION POOLING SETUP ---
# We initialize a pool with 5 min and 20 max connections
try:
    connection_pool = psycopg2.pool.ThreadedConnectionPool(
        5, 20,
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
    print("✅ Connection pool created successfully")
except Exception as e:
    print(f"❌ Error creating connection pool: {e}")

def get_db_connection():
    """Gets a connection from the pool."""
    return connection_pool.getconn()

def release_db_connection(conn):
    """Returns a connection back to the pool."""
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
        RETURNING id, full_name, plan, role;
    """
    
    try:
        cursor.execute(query, (full_name, email, hashed_pwd))
        user_record = cursor.fetchone()
        conn.commit()
        
        # Returning a structured dict ready for Pydantic
        return {
            "id": str(user_record[0]),
            "full_name": user_record[1],
            "plan": user_record[2],
            "role": user_record[3]
        }
        
    except errors.UniqueViolation:
        # Catching the exact error when an email already exists
        conn.rollback()
        return {"error": "email_exists"}
        
    except Exception as e:
        # Catching other random database errors
        print(f"❌ Error creating user: {e}")
        conn.rollback()
        return {"error": "database_error"}
        
    finally:
        cursor.close()
        release_db_connection(conn)

def authenticate_user(email, password):
    """Verifies user credentials using the connection pool."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT id, full_name, password_hash, plan, role FROM users WHERE email = %s;"
    
    try:
        cursor.execute(query, (email,))
        user_record = cursor.fetchone()
        if user_record:
            user_id, full_name, hashed_pwd, plan, role = user_record
            if verify_password(password, hashed_pwd):
                return {"id": str(user_id), "full_name": full_name, "plan": plan, "role": role}
        return None
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
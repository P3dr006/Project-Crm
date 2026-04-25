import os
import psycopg2
from dotenv import load_dotenv
from src.auth_utils import hash_password, verify_password

# Load environment variables from root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", "..", ".env"))

def get_connection():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        port=os.getenv("POSTGRES_PORT")
    )

# --- USER FUNCTIONS ---

def create_user(full_name, email, raw_password):
    """Creates a new user with a hashed password for security."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Securely hash the password before saving
    hashed_pwd = hash_password(raw_password)
    
    # Notice we let the DB handle the default 'plan' (Bronze) and 'role' (Owner)
    query = """
        INSERT INTO users (full_name, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING id;
    """
    
    try:
        cursor.execute(query, (full_name, email, hashed_pwd))
        user_id = cursor.fetchone()[0]
        conn.commit()
        print(f"✅ User created successfully with ID: {user_id}")
        return str(user_id) # Convert UUID to string for JSON compatibility
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def authenticate_user(email, password):
    """
    Verifies user credentials and returns SaaS data (plan and role).
    """
    conn = get_connection()
    cursor = conn.cursor()

    # UPDATED: Fetching the new plan and role columns
    query = "SELECT id, full_name, password_hash, plan, role FROM users WHERE email = %s;"
    
    try:
        cursor.execute(query, (email,))
        user_record = cursor.fetchone()

        if user_record:
            user_id, full_name, hashed_pwd, plan, role = user_record
            
            # Checking if the plain password matches the hashed one
            if verify_password(password, hashed_pwd):
                print(f"✅ Login successful for: {full_name} ({role} - {plan} Plan)")
                return {
                    "id": str(user_id), 
                    "full_name": full_name,
                    "plan": plan,
                    "role": role
                }
            
        print("❌ Invalid email or password.")
        return None

    except Exception as e:
        print(f"❌ Database error during login: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


# --- LEAD FUNCTIONS (The CRM Engine) ---

def create_lead(user_id: str, lead_data):
    """Saves a new lead linked to a specific user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO leads (user_id, full_name, phone, email, status, source)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    
    try:
        cursor.execute(query, (
            user_id,
            lead_data.full_name,
            lead_data.phone,
            lead_data.email,
            lead_data.status.value, # .value extracts the string from the Enum
            lead_data.source.value
        ))
        lead_id = cursor.fetchone()[0]
        conn.commit()
        return str(lead_id)
    except Exception as e:
        print(f"❌ Error creating lead: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def get_leads_by_user(user_id: str):
    """Fetches all leads belonging to a specific user, ordered by newest."""
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, full_name, phone, email, status, source, next_contact_date, notes, created_at
        FROM leads
        WHERE user_id = %s
        ORDER BY created_at DESC;
    """
    
    try:
        cursor.execute(query, (user_id,))
        # Dynamically map column names to the fetched rows to return a list of dictionaries
        columns = [desc[0] for desc in cursor.description]
        leads = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Convert UUIDs and Dates to strings for JSON
        for lead in leads:
            lead['id'] = str(lead['id'])
            if lead['created_at']:
                lead['created_at'] = lead['created_at'].isoformat()
            if lead['next_contact_date']:
                lead['next_contact_date'] = lead['next_contact_date'].isoformat()
                
        return leads
    except Exception as e:
        print(f"❌ Error fetching leads: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


# --- TEST BLOCK ---
if __name__ == "__main__":
    print("--- STARTING TESTS ---")
    
    # Attempt to create a user (will fail gracefully if the email already exists)
    create_user("Pedro Admin", "admin@email.com", "secure123")
    
    # Test the login flow
    user = authenticate_user("admin@email.com", "secure123")
    if user:
        print(f"🎉 Welcome back, {user['full_name']}! Your plan is {user['plan']}.")
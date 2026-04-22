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

def create_user(full_name, email, raw_password):
    """Creates a new user with a hashed password for security."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Securely hash the password before saving
    hashed_pwd = hash_password(raw_password)
    
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
        return user_id
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def authenticate_user(email, password):
    """
    Verifies user credentials.
    Returns the user object if successful, None otherwise.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Searching for the user by email
    query = "SELECT id, full_name, password_hash FROM users WHERE email = %s;"
    
    try:
        cursor.execute(query, (email,))
        user_record = cursor.fetchone()

        if user_record:
            user_id, full_name, hashed_pwd = user_record
            
            # Checking if the plain password matches the hashed one
            if verify_password(password, hashed_pwd):
                print(f"✅ Login successful for: {full_name}")
                return {"id": user_id, "full_name": full_name}
            
        print("❌ Invalid email or password.")
        return None

    except Exception as e:
        print(f"❌ Database error during login: {e}")
        return None
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
        print(f"🎉 Welcome back, {user['full_name']}!")
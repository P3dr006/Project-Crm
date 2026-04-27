import os
from dotenv import load_dotenv

#Single entry point: The only location in the project that loads the .env file.
load_dotenv()

#--- SECURITY ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("CRITICAL ERROR: SECRET_KEY not found in environment variables!")

#--- DATABASE ---
DB_HOST = os.getenv("POSTGRES_HOST")
DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("POSTGRES_PASSWORD")
DB_PORT = os.getenv("POSTGRES_PORT")
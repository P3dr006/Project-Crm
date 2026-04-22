import os
from dotenv import load_dotenv
# Load environment variables before anything else!
load_dotenv()

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Internal imports from your own files
from src.database import create_user, authenticate_user
from src.schemas import UserCreate, UserLogin, UserResponse
from src.auth_utils import create_access_token # <--- New import for JWT!

# Initialize the FastAPI application
app = FastAPI(
    title="CRMAX Backend API",
    description="Backend API for managing leads and users",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ROUTES ---

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate):
    """
    Registers a new user in the system.
    Validates data via Pydantic and saves to PostgreSQL.
    """
    new_user_id = create_user(
        full_name=user_data.full_name,
        email=user_data.email,
        raw_password=user_data.password
    )
    
    if not new_user_id:
        # If create_user returns None, it's usually because the email is already taken
        raise HTTPException(
            status_code=400, 
            detail="Email already registered or database error."
        )
    
    return {"id": new_user_id, "full_name": user_data.full_name}

@app.post("/login") # Removed response_model to allow the token to be returned
def login(credentials: UserLogin):
    """
    Authenticates a user and returns a JWT Access Token.
    """
    # 1. Checks if the email and password are correct in the database
    user = authenticate_user(email=credentials.email, password=credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. If the password is correct, generates the VIP Badge (JWT Token)
    # We put the user's ID inside the token (referred to as the 'sub' or subject)
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    # 3. Returns the token for the frontend to store, along with user data
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# --- SYSTEM ROUTES ---

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "CRMAX API is running securely! 🚀"}
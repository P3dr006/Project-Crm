from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Internal imports from your own files
from src.database import create_user, authenticate_user
from src.schemas import UserCreate, UserLogin, UserResponse

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

@app.post("/login", response_model=UserResponse)
def login(credentials: UserLogin):
    """
    Authenticates a user and returns their basic info.
    In the future, this will return a JWT Token.
    """
    user = authenticate_user(email=credentials.email, password=credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# --- SYSTEM ROUTES ---

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "Legacy Nexus API is running securely! 🚀"}
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

# Internal imports from your own files
from src.database import create_user, authenticate_user, create_lead, get_leads_by_user
from src.schemas import UserCreate, UserLogin, LeadCreate
from src.auth_utils import create_access_token, verify_access_token

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

# --- SECURITY DEPENDENCY (THE GUARD) ---
security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Extracts the token from the request header and verifies it.
    Returns the user_id if valid, otherwise raises a 401 error automatically.
    """
    token = credentials.credentials
    user_id = verify_access_token(token)
    return user_id

# --- AUTH ROUTES ---

@app.post("/register", status_code=status.HTTP_201_CREATED)
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
    
    return {"id": new_user_id, "full_name": user_data.full_name, "message": "User registered successfully."}

@app.post("/login")
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
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    # 3. Returns the token for the frontend to store, along with user data
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# --- CRM ROUTES (PROTECTED API) ---

@app.post("/leads", status_code=status.HTTP_201_CREATED)
def create_new_lead(lead_data: LeadCreate, user_id: str = Depends(get_current_user_id)):
    """
    Creates a new lead.
    PROTECTED: Requires a valid JWT token. The lead is automatically linked to the token's owner.
    """
    new_lead_id = create_lead(user_id=user_id, lead_data=lead_data)
    
    if not new_lead_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lead. Please check your data."
        )
        
    return {"id": new_lead_id, "message": "Lead created successfully"}

@app.get("/leads")
def get_user_leads(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves all leads belonging to the currently logged-in user.
    PROTECTED: Requires a valid JWT token.
    """
    leads = get_leads_by_user(user_id=user_id)
    return {"leads": leads, "total": len(leads)}

# --- SYSTEM ROUTES ---

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "CRMAX API is running securely! "}
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

# Internal imports from your own files
from typing import Optional
from src.crud.users import create_user, authenticate_user, update_user
from src.crud.leads import create_lead, get_leads_by_workspace, get_lead_by_id, delete_lead, update_lead
from src.crud.stats import get_stats
from src.schemas import UserCreate, UserLogin, UserResponse, UserUpdate, LeadCreate, LeadUpdate, AuthResponse
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
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verifies the JWT and returns {"user_id": ..., "workspace_id": ...}."""
    return verify_access_token(credentials.credentials)

# --- AUTH ROUTES ---

@app.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate):
    """
    Registers a new user and automatically logs them in (returns JWT).
    """
    result = create_user(
        full_name=user_data.full_name,
        email=user_data.email,
        raw_password=user_data.password,
        company_name=user_data.company_name
    )
    
    # Differentiating the errors for the frontend
    if result.get("error") == "email_exists":
        raise HTTPException(
            status_code=400, 
            detail="This email is already registered."
        )
    elif result.get("error") == "database_error":
        raise HTTPException(
            status_code=500, 
            detail="Internal server error while creating user."
        )
    
    access_token = create_access_token(
        data={
            "sub": result["id"],
            "workspace_id": result["workspace_id"],
            "role": result["role"],
        }
    )
    # If no errors, return the dict. Pydantic ensures it matches UserResponse.
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": result
    }

@app.post("/login",response_model=AuthResponse)
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
    access_token = create_access_token(data={"sub": str(user["id"]), "workspace_id": str(user["workspace_id"]), "role": user["role"]})
    
    # 3. Returns the token for the frontend to store, along with user data
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.patch("/users/me")
def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = update_data.model_dump(exclude_unset=True)
    result = update_user(current_user["user_id"], update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

@app.get("/stats")
def get_dashboard_stats(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return get_stats(current_user["workspace_id"], start, end)

# --- CRM ROUTES (PROTECTED API) ---

@app.post("/leads", status_code=status.HTTP_201_CREATED)
def create_new_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    new_lead_id = create_lead(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        lead_data=lead_data
    )
    if not new_lead_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create lead.")
    return {"id": new_lead_id, "message": "Lead created successfully"}

@app.get("/leads")
def get_workspace_leads(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    offset = (page - 1) * size
    leads = get_leads_by_workspace(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
        start_date=start,
        end_date=end,
        limit=size,
        offset=offset,
    )
    return {"page": page, "size": size, "leads": leads}

@app.get("/leads/{lead_id}")
def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = get_lead_by_id(lead_id, current_user["workspace_id"])
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@app.patch("/leads/{lead_id}")
def patch_lead(lead_id: str, lead_data: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = lead_data.model_dump(exclude_unset=True)
    success = update_lead(lead_id, current_user["workspace_id"], update_dict)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found or no changes made")
    return {"message": "Lead updated successfully"}

@app.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    success = delete_lead(lead_id, current_user["workspace_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return None


# --- SYSTEM ROUTES ---

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "CRMAX API is running securely! "}
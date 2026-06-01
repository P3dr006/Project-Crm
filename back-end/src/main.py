import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from typing import Optional

from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.auth_utils import create_access_token, verify_access_token
from src.crud.events import create_event, get_events_by_workspace, update_event, delete_event
from src.crud.leads import create_lead, get_leads_by_workspace, get_lead_by_id, delete_lead, update_lead, auto_close_stale_callbacks
from src.crud.stats import get_stats
from src.crud.users import create_user, authenticate_user, update_user, get_workspace_members
from src.schemas import (
    AuthResponse,
    EventCreate, EventUpdate, EventResponse,
    LeadCreate, LeadUpdate,
    UserCreate, UserLogin, UserUpdate,
)


# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="CRMAX Backend API",
    description="Backend API for managing leads and users",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# AUTH DEPENDENCY
# =============================================================================

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verifies the JWT and returns {"user_id", "workspace_id", "role"}."""
    return verify_access_token(credentials.credentials)


# =============================================================================
# AUTH ROUTES
# =============================================================================

@app.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate):
    result = create_user(
        full_name=user_data.full_name,
        email=user_data.email,
        raw_password=user_data.password,
        company_name=user_data.company_name,
    )

    if result.get("error") == "email_exists":
        raise HTTPException(status_code=400, detail="This email is already registered.")
    if result.get("error") == "database_error":
        raise HTTPException(status_code=500, detail="Internal server error while creating user.")

    access_token = create_access_token(data={
        "sub": result["id"],
        "workspace_id": result["workspace_id"],
        "role": result["role"],
    })
    return {"access_token": access_token, "token_type": "bearer", "user": result}


@app.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin):
    user = authenticate_user(email=credentials.email, password=credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={
        "sub": str(user["id"]),
        "workspace_id": str(user["workspace_id"]),
        "role": user["role"],
    })
    return {"access_token": access_token, "token_type": "bearer", "user": user}


# =============================================================================
# USER ROUTES
# =============================================================================

@app.patch("/users/me")
def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = update_data.model_dump(exclude_unset=True)
    result = update_user(current_user["user_id"], update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@app.get("/users/members")
def list_workspace_members(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "Employee":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Managers and Owners only.")
    return get_workspace_members(workspace_id=current_user["workspace_id"])


# =============================================================================
# STATS ROUTES
# =============================================================================

@app.get("/stats")
def get_dashboard_stats(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return get_stats(current_user["workspace_id"], start, end)


# =============================================================================
# LEAD ROUTES
# =============================================================================

@app.post("/leads", status_code=status.HTTP_201_CREATED)
def create_new_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    new_lead_id = create_lead(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        lead_data=lead_data,
    )
    if not new_lead_id:
        raise HTTPException(status_code=500, detail="Failed to create lead.")
    return {"id": new_lead_id, "message": "Lead created successfully"}


@app.get("/leads")
def get_workspace_leads(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    start: Optional[str] = None,
    end: Optional[str] = None,
    callback_start: Optional[str] = None,
    callback_end: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    offset = (page - 1) * size
    leads = get_leads_by_workspace(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
        start_date=start,
        end_date=end,
        callback_start=callback_start,
        callback_end=callback_end,
        limit=size,
        offset=offset,
    )
    return {"page": page, "size": size, "leads": leads}


@app.get("/leads/{lead_id}")
def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = get_lead_by_id(
        lead_id,
        current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@app.post("/leads/auto-close", status_code=status.HTTP_200_OK)
def run_auto_close(current_user: dict = Depends(get_current_user)):
    """Closes leads with callbacks overdue by 60+ days, marking them as No Response."""
    closed = auto_close_stale_callbacks(current_user["workspace_id"])
    return {"closed": closed}


@app.patch("/leads/{lead_id}")
def patch_lead(lead_id: str, lead_data: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = lead_data.model_dump(exclude_unset=True)
    success = update_lead(
        lead_id,
        current_user["workspace_id"],
        update_dict,
        user_id=current_user["user_id"],
        role=current_user["role"],
    )
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found or no changes made")
    return {"message": "Lead updated successfully"}


@app.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    success = delete_lead(lead_id, current_user["workspace_id"], role=current_user["role"])
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")


# =============================================================================
# EVENT ROUTES
# =============================================================================

@app.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_new_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    return create_event(
        workspace_id=current_user["workspace_id"],
        created_by=current_user["user_id"],
        user_role=current_user["role"],
        data=event_data.model_dump(),
    )


@app.get("/events", response_model=list[EventResponse])
def list_events(
    scheduled_start: Optional[str] = None,
    scheduled_end: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return get_events_by_workspace(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
    )


@app.patch("/events/{event_id}", response_model=EventResponse)
def patch_event(event_id: str, update_data: EventUpdate, current_user: dict = Depends(get_current_user)):
    return update_event(
        event_id=event_id,
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
        data=update_data.model_dump(exclude_unset=True),
    )


@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_event(event_id: str, current_user: dict = Depends(get_current_user)):
    delete_event(
        event_id=event_id,
        workspace_id=current_user["workspace_id"],
        user_id=current_user["user_id"],
        role=current_user["role"],
    )


# =============================================================================
# SYSTEM ROUTES
# =============================================================================

@app.get("/")
def health_check():
    return {"message": "CRMAX API is running securely."}

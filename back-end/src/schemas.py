from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID

# --- ENUMS (Must match the database exactly) ---

class LeadStatus(str, Enum):
    """Allowed values for lead status."""
    new = "New"
    in_progress = "In Progress"
    qualified = "Qualified"
    lost = "Lost"
    converted = "Converted"

class LeadSource(str, Enum):
    """Allowed values for lead source."""
    instagram = "Instagram"
    whatsapp = "WhatsApp"
    website = "Website"
    referral = "Referral"
    other = "Other"

class PlanType(str, Enum):
    Bronze = 'Bronze'
    Silver = 'Silver'
    Gold = 'Gold'

class UserRole(str, Enum):
    Owner = 'Owner'
    Manager = 'Manager'
    Employee = 'Employee'

# --- USER SCHEMAS ---

class UserCreate(BaseModel):
    """Data required to register a new user."""
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr # Automatically validates if it has an '@' and a domain
    password: str = Field(..., min_length=6) # Enforces a minimum password length
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    """Data required for a user to log in."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Data returned to the frontend (NEVER return the password)."""
    id: str
    workspace_id: str
    full_name: str
    email: str
    plan: PlanType
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema for updating user information. All fields are optional."""
    full_name: Optional[str] = Field(None, min_length=3, max_length=100)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- LEAD SCHEMAS ---

class LeadCreate(BaseModel):
    """Data required to create a new lead."""
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=8, max_length=20)
    email: Optional[EmailStr] = None
    status: LeadStatus = LeadStatus.new
    source: LeadSource = LeadSource.other
    notes: Optional[str] = None
    next_contact_date: Optional[str] = None

class LeadUpdate(BaseModel):
    """Schema for updating leads. All fields are optional."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=8, max_length=20)
    email: Optional[EmailStr] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    notes: Optional[str] = None
    next_contact_date: Optional[str] = None


# --- EVENT SCHEMAS ---

class EventCreate(BaseModel):
    """Data required to create a new event (meeting or callback)."""
    title: str = Field(..., min_length=3, max_length=200)
    scheduled_at: datetime
    type: Literal["meeting", "callback"] = "meeting"
    assigned_to: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    notes: Optional[str] = None

class EventUpdate(BaseModel):
    """Schema for updating an event. All fields are optional."""
    title: Optional[str] = Field(None, max_length=200)
    scheduled_at: Optional[datetime] = None
    status: Optional[Literal["pending", "done", "cancelled"]] = None
    notes: Optional[str] = None
    assigned_to: Optional[UUID] = None

class EventResponse(BaseModel):
    """Data returned to the frontend for an event."""
    id: UUID
    workspace_id: UUID
    created_by: UUID
    assigned_to: UUID
    lead_id: Optional[UUID] = None
    type: str
    title: str
    notes: Optional[str] = None
    scheduled_at: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from typing import Optional
from datetime import datetime

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

class UserLogin(BaseModel):
    """Data required for a user to log in."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Data returned to the frontend (NEVER return the password)."""
    id: str
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

# --- LEAD SCHEMAS ---

class LeadCreate(BaseModel):
    """Data required to create a new lead."""
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=8, max_length=20)
    email: Optional[EmailStr] = None # Email is optional for leads
    status: LeadStatus = LeadStatus.new # Defaults to 'New'
    source: LeadSource = LeadSource.other # Defaults to 'Other'

class LeadUpdate(BaseModel):
    """Schema for updating leads. All fields are optional."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=8, max_length=20)
    email: Optional[EmailStr] = None
    status: Optional[LeadStatus] = None # Enums can be validated in the logic
    source: Optional[LeadSource] = None


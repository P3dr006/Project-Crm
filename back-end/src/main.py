from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize the FastAPI application
app = FastAPI(
    title="CRMAX Backend API",
    description="Backend API for managing leads and users",
    version="1.0.0"
)

# CORS Configuration
# This allows your frontend (e.g., Live Server, React, etc.) to communicate with this API
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    # Add other frontend URLs here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"], # Allows all headers
)

# --- ROUTES ---

@app.get("/")
def read_root():
    """Health check endpoint to verify the API is running."""
    return {"message": "Legacy Nexus API is running securely! 🚀"}
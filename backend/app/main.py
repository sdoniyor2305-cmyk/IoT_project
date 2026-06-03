"""
Main FastAPI Application
Purpose: FastAPI app initialization, CORS setup, route registration
"""

import sys
import os

# Add project root to sys.path so `crypto` package is importable.
# Local dev: project root is two levels above this file (backend/app/main.py -> IoT_proect/).
# Docker: crypto is copied to /crypto, so we add "/" as well.
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)
if "/" not in sys.path:
    sys.path.insert(0, "/")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Import routes
from app.routes import auth_routes, device_routes, key_routes, encryption_routes, analysis_routes, admin_routes
from app.utils.database import init_db, create_superadmin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="IoT Key Generation Platform",
    description="Secure key generation and encryption for IoT devices",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=[
        {"name": "Authentication", "description": "User registration, login, and token management."},
        {"name": "Devices", "description": "Manage IoT devices: CRUD and status updates."},
        {"name": "Keys", "description": "Generate, export, and inspect cryptographic keys."},
        {"name": "Encryption", "description": "Encryption and decryption operations and operation history."},
        {"name": "Analysis", "description": "Entropy analysis and algorithm performance statistics."},
        {"name": "General", "description": "Health checks and basic API information."}
    ]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(device_routes.router)
app.include_router(key_routes.router)
app.include_router(encryption_routes.router)
app.include_router(analysis_routes.router)
app.include_router(admin_routes.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and seed superadmin on startup"""
    logger.info("Starting up - initializing database")
    init_db()
    create_superadmin()
    logger.info("Database initialized")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "IoT Key Generation Platform API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "IoT Key Generation Platform"
    }


@app.get("/api/info")
def get_api_info():
    """Get API information"""
    return {
        "name": "IoT Key Generation Platform",
        "version": "1.0.0",
        "description": "Lightweight encryption key generation for IoT devices",
        "supported_algorithms": ["ASCON", "AES", "SPECK"],
        "key_generation_methods": ["DRBG", "TRNG", "PUF"],
        "supported_key_lengths": ["64-bit", "128-bit", "256-bit"]
    }


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    return JSONResponse(
        status_code=400,
        content={"error": "ValueError", "message": str(exc)}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handle generic exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "message": "An unexpected error occurred"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

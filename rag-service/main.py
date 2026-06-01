"""
CodeLens - RAG-based codebase intelligence FastAPI service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.ingest import router as ingest_router
from app.api.chat import router as chat_router

# Create FastAPI app
app = FastAPI(
    title="CodeLens",
    description="RAG-based codebase intelligence service for understanding codebases",
    version="1.0.0",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ingest_router, prefix="/api", tags=["api"])
app.include_router(chat_router, prefix="/api", tags=["api"])


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - service status.

    Returns:
        Service information
    """
    return {
        "service": "CodeLens",
        "status": "running",
        "version": "1.0.0",
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Health status
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

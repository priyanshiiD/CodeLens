"""
CodeLens - RAG-based codebase intelligence FastAPI service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.api.ingest import router as ingest_router, restore_ingestion_status
from app.api.chat import router as chat_router


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle - restore state on startup."""
    # Startup: restore ingestion status from PostgreSQL
    await restore_ingestion_status()
    yield
    # Shutdown: cleanup if needed


# Create FastAPI app with lifespan
app = FastAPI(
    title="CodeLens",
    description="RAG-based codebase intelligence service for understanding codebases",
    version="1.0.0",
    lifespan=lifespan,
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
@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """
    Health check endpoint.

    Returns:
        Health status
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    import os
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
    )

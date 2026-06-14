"""
Chat API for CodeLens RAG service.
Handles user questions about ingested repositories.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
from urllib.parse import quote, unquote

from app.services.retriever import ask
from app.api.ingest import ingestion_status

# Router setup
router = APIRouter(prefix="/chat", tags=["chat"])

# Chat history storage (repo_url -> list of conversations)
chat_history: Dict[str, List[Dict[str, Any]]] = {}

# Maximum history entries per repository
MAX_HISTORY_PER_REPO = 10


# Request/Response models
class ChatRequest(BaseModel):
    repo_url: str
    question: str
    n_results: int = 5


class ChatResponse(BaseModel):
    repo_url: str
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    chunks_used: int
    timestamp: str


class HistoryEntry(BaseModel):
    question: str
    answer: str
    timestamp: str
    chunks_used: int


class HistoryResponse(BaseModel):
    repo_url: str
    history: List[HistoryEntry]


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Ask a question about an ingested repository.

    Args:
        request: Chat request with repo_url, question, and n_results

    Returns:
        Chat response with answer, sources, and metadata

    Raises:
        HTTPException: If repo not ingested or question fails
    """
    # Validate inputs
    if not request.repo_url or not isinstance(request.repo_url, str):
        raise HTTPException(status_code=400, detail="Invalid repo_url")
    
    if not request.question or not isinstance(request.question, str):
        raise HTTPException(status_code=400, detail="Invalid question")
    
    if request.n_results < 1 or request.n_results > 20:
        raise HTTPException(
            status_code=400,
            detail="n_results must be between 1 and 20"
        )
    
    # Check if repository has been ingested
    status_key = quote(request.repo_url, safe="")
    
    if status_key not in ingestion_status:
        raise HTTPException(
            status_code=404,
            detail=f"Repository not ingested yet. Please ingest {request.repo_url} first using POST /ingest"
        )
    
    repo_status = ingestion_status[status_key]
    
    if repo_status == "processing":
        raise HTTPException(
            status_code=503,
            detail=f"Repository {request.repo_url} is still being processed. Please try again later."
        )
    
    if repo_status == "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Repository {request.repo_url} ingestion failed. Please try ingesting again."
        )
    
    # Ask question
    try:
        result = ask(
            question=request.question,
            repo_url=request.repo_url,
            n_results=request.n_results,
        )
        
        # Get current timestamp
        timestamp = datetime.utcnow().isoformat()
        
        # Build response
        response = ChatResponse(
            repo_url=request.repo_url,
            question=request.question,
            answer=result["answer"],
            sources=result["sources"],
            chunks_used=result["chunks_used"],
            timestamp=timestamp
        )
        
        # Store in history
        _add_to_history(
            repo_url=request.repo_url,
            question=request.question,
            answer=result["answer"],
            chunks_used=result["chunks_used"],
            timestamp=timestamp
        )
        
        return response
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error answering question: {str(e)}"
        )


@router.get("/history/{repo_url:path}", response_model=HistoryResponse)
async def get_chat_history(repo_url: str) -> HistoryResponse:
    """
    Get chat history for a repository.

    Args:
        repo_url: GitHub repository URL (URL encoded in path)

    Returns:
        History response with last N conversations

    Raises:
        HTTPException: If repo not found
    """
    # Decode repo_url
    repo_url = unquote(repo_url)
    
    # Check if repo has been ingested
    status_key = quote(repo_url, safe="")
    
    if status_key not in ingestion_status:
        raise HTTPException(
            status_code=404,
            detail=f"Repository {repo_url} not found in chat history"
        )
    
    # Get history
    history_list = chat_history.get(status_key, [])
    
    # Convert to HistoryEntry models
    history_entries = [
        HistoryEntry(
            question=entry["question"],
            answer=entry["answer"],
            timestamp=entry["timestamp"],
            chunks_used=entry["chunks_used"],
        )
        for entry in history_list
    ]
    
    return HistoryResponse(
        repo_url=repo_url,
        history=history_entries
    )


@router.delete("/history/{repo_url:path}")
async def clear_chat_history(repo_url: str) -> dict:
    """
    Clear chat history for a repository.

    Args:
        repo_url: GitHub repository URL (URL encoded in path)

    Returns:
        Confirmation message

    Raises:
        HTTPException: If repo not found
    """
    # Decode repo_url
    repo_url = unquote(repo_url)
    status_key = quote(repo_url, safe="")
    
    if status_key not in chat_history:
        raise HTTPException(
            status_code=404,
            detail=f"No chat history found for {repo_url}"
        )
    
    # Clear history
    chat_history[status_key] = []
    
    return {
        "message": f"Chat history cleared for {repo_url}",
        "repo_url": repo_url
    }


def _add_to_history(
    repo_url: str,
    question: str,
    answer: str,
    chunks_used: int,
    timestamp: str
) -> None:
    """
    Add conversation to chat history.

    Args:
        repo_url: Repository URL
        question: User question
        answer: AI answer
        chunks_used: Number of chunks used
        timestamp: Conversation timestamp
    """
    status_key = quote(repo_url, safe="")
    
    # Initialize history for repo if not exists
    if status_key not in chat_history:
        chat_history[status_key] = []
    
    # Add entry
    entry = {
        "question": question,
        "answer": answer,
        "chunks_used": chunks_used,
        "timestamp": timestamp,
    }
    
    chat_history[status_key].append(entry)
    
    # Keep only last MAX_HISTORY_PER_REPO entries
    if len(chat_history[status_key]) > MAX_HISTORY_PER_REPO:
        chat_history[status_key] = chat_history[status_key][-MAX_HISTORY_PER_REPO:]

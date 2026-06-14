"""
Repository ingestion API for CodeLens RAG service.
Handles cloning, chunking, embedding, and storing code in ChromaDB.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from urllib.parse import quote, unquote
import traceback

from app.services.github_loader import clone_repo, get_code_files
from app.services.chunker import chunk_file
from app.services.embedder import embed_chunks_batch
from app.vectorstore.chroma import store_chunks, delete_repo, get_repo_stats, get_collection

# Router setup
router = APIRouter(prefix="/ingest", tags=["ingest"])

# Ingestion status tracker
ingestion_status = {}


async def restore_ingestion_status() -> None:
    """
    Startup function: Restore ingestion status from ChromaDB.
    
    Queries the ChromaDB collection, extracts all unique repo_urls
    from metadata, and sets their status to "completed".
    """
    try:
        print("Restoring ingestion status from ChromaDB...")
        collection = get_collection()
        
        # Get all documents from collection
        all_docs = collection.get()
        
        if not all_docs or not all_docs.get("metadatas"):
            print("No documents found in ChromaDB")
            return
        
        # Extract unique repo_urls from metadata
        unique_repos = set()
        for metadata in all_docs["metadatas"]:
            if metadata and "repo_url" in metadata:
                unique_repos.add(metadata["repo_url"])
        
        # Set status to completed for each repo
        for repo_url in unique_repos:
            status_key = quote(repo_url, safe="")
            ingestion_status[status_key] = "completed"
            print(f"  Restored: {repo_url}")
            print(f"    Key: {status_key}")
        
        print(f"Restored {len(unique_repos)} repositories from ChromaDB")
        print(f"Ingestion status keys: {list(ingestion_status.keys())}")
    
    except Exception as e:
        print(f"Error restoring ingestion status: {str(e)}")
        print("Continuing startup anyway...")


# Request/Response models
class IngestRequest(BaseModel):
    repo_url: str


class IngestResponse(BaseModel):
    status: str
    repo_url: str


class StatusResponse(BaseModel):
    repo_url: str
    status: str
    details: dict = {}


class DeleteResponse(BaseModel):
    message: str
    chunks_deleted: int


def _ingest_repository(repo_url: str) -> None:
    """
    Background task: Clone, chunk, embed, and store repository.

    Args:
        repo_url: GitHub repository URL
    """
    try:
        status_key = quote(repo_url, safe="")
        ingestion_status[status_key] = "processing"
        
        print(f"Starting ingestion for {repo_url}...")
        
        # Step 1: Clone repository
        print(f"  [1/5] Cloning repository...")
        repo_path = clone_repo(repo_url)
        
        # Step 2: Get all code files
        print(f"  [2/5] Extracting code files...")
        code_files = get_code_files(repo_path)
        
        if not code_files:
            raise ValueError(f"No code files found in {repo_url}")
        
        print(f"  Found {len(code_files)} code files")
        
        # Step 3: Chunk all files
        print(f"  [3/5] Chunking code files...")
        all_chunks = []
        
        for file_path in code_files:
            try:
                chunks = chunk_file(file_path)
                # Convert absolute path to repo-relative path for GitHub URLs
                # e.g. C:/tmp/repos/express/lib/router/index.js → lib/router/index.js
                repo_path_prefix = repo_path.replace("\\", "/").rstrip("/") + "/"
                relative = file_path.replace("\\", "/").replace(repo_path_prefix, "")
                for chunk in chunks:
                    chunk["metadata"]["file_path"] = relative
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"  Warning: Failed to chunk {file_path}: {str(e)}")
                continue
        
        if not all_chunks:
            raise ValueError("No chunks created from code files")
        
        print(f"  Created {len(all_chunks)} chunks")
        
        # Step 4: Embed chunks in batches
        print(f"  [4/5] Embedding chunks...")
        embedded_chunks = embed_chunks_batch(all_chunks, batch_size=10)
        
        print(f"  Embedded {len(embedded_chunks)} chunks")
        
        # Step 5: Store in ChromaDB
        print(f"  [5/5] Storing in ChromaDB...")
        stored_count = store_chunks(embedded_chunks, repo_url)
        
        print(f"Successfully ingested {repo_url}: {stored_count} chunks stored")
        ingestion_status[status_key] = "completed"
    
    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error ingesting {repo_url}: {error_msg}")
        status_key = quote(repo_url, safe="")
        ingestion_status[status_key] = "failed"


@router.post("/", response_model=IngestResponse)
async def ingest_repository(
    request: IngestRequest,
    background_tasks: BackgroundTasks
) -> IngestResponse:
    """
    Start repository ingestion in background.

    Args:
        request: Ingest request with repo_url

    Returns:
        Status response indicating processing started

    Raises:
        HTTPException: If repo_url is invalid
    """
    if not request.repo_url or not isinstance(request.repo_url, str):
        raise HTTPException(status_code=400, detail="Invalid repo_url")
    
    # Validate GitHub URL format
    if not ("github.com" in request.repo_url or request.repo_url.startswith("http")):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL format"
        )
    
    # Create status key
    status_key = quote(request.repo_url, safe="")
    
    # Check if already processing
    if status_key in ingestion_status:
        current_status = ingestion_status[status_key]
        if current_status == "processing":
            raise HTTPException(
                status_code=409,
                detail=f"Repository {request.repo_url} is already being processed"
            )
    
    # Add background task
    background_tasks.add_task(_ingest_repository, request.repo_url)
    
    # Set initial status
    ingestion_status[status_key] = "processing"
    
    return IngestResponse(
        status="processing",
        repo_url=request.repo_url
    )


@router.get("/status/{repo_url:path}", response_model=StatusResponse)
async def get_ingestion_status(repo_url: str) -> StatusResponse:
    """
    Get ingestion status for a repository.

    Args:
        repo_url: GitHub repository URL (URL encoded in path)

    Returns:
        Status response with current ingestion state

    Raises:
        HTTPException: If repo not found in ingestion queue
    """
    # Decode repo_url from path
    repo_url = unquote(repo_url)
    
    # Try multiple key formats to handle encoding mismatches
    status_key = None
    
    print(f"\nLooking up status for repo_url: {repo_url}")
    print(f"Available keys in ingestion_status: {list(ingestion_status.keys())}")
    
    # Format 1: quote(repo_url, safe="")
    key_format_1 = quote(repo_url, safe="")
    print(f"  Format 1 key: {key_format_1}")
    if key_format_1 in ingestion_status:
        status_key = key_format_1
        print(f"  ✓ Found with Format 1")
    
    # Format 2: quote(unquote(repo_url), safe="")
    if status_key is None:
        key_format_2 = quote(unquote(repo_url), safe="")
        print(f"  Format 2 key: {key_format_2}")
        if key_format_2 in ingestion_status:
            status_key = key_format_2
            print(f"  ✓ Found with Format 2")
    
    # Format 3: direct repo_url
    if status_key is None:
        print(f"  Format 3 key: {repo_url}")
        if repo_url in ingestion_status:
            status_key = repo_url
            print(f"  ✓ Found with Format 3")
    
    # Not found in any format
    if status_key is None:
        print(f"  ✗ Not found in any format")
        raise HTTPException(
            status_code=404,
            detail=f"No ingestion record found for {repo_url}"
        )
    
    status = ingestion_status[status_key]
    details = {}
    
    # Get additional stats if completed
    if status == "completed":
        try:
            stats = get_repo_stats(repo_url)
            details = {
                "total_chunks": stats.get("total_chunks", 0),
                "languages": stats.get("languages", {}),
                "file_count": len(stats.get("files", {})),
            }
        except Exception as e:
            print(f"Error getting stats for {repo_url}: {str(e)}")
    
    return StatusResponse(
        repo_url=repo_url,
        status=status,
        details=details
    )


@router.delete("/{repo_url:path}", response_model=DeleteResponse)
async def delete_ingested_repo(repo_url: str) -> DeleteResponse:
    """
    Delete all chunks for a repository from ChromaDB.

    Args:
        repo_url: GitHub repository URL (URL encoded in path)

    Returns:
        Response with number of chunks deleted

    Raises:
        HTTPException: If deletion fails
    """
    # Decode repo_url from path
    repo_url = unquote(repo_url)
    
    try:
        # Delete from ChromaDB
        chunks_deleted = delete_repo(repo_url)
        
        # Remove from status tracker
        status_key = quote(repo_url, safe="")
        if status_key in ingestion_status:
            del ingestion_status[status_key]
        
        return DeleteResponse(
            message=f"Successfully deleted repository {repo_url}",
            chunks_deleted=chunks_deleted
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete repository: {str(e)}"
        )


@router.get("/", tags=["ingest"])
async def get_all_ingestion_status() -> dict:
    """
    Get status of all ongoing/completed ingestions.

    Returns:
        Dictionary of repo URLs to their statuses
    """
    result = {}
    
    for status_key, status in ingestion_status.items():
        repo_url = unquote(status_key)
        result[repo_url] = status
    
    return result

"""
Repository ingestion API for CodeLens RAG service.
Handles cloning, chunking, embedding, and storing code in pgvector (PostgreSQL).
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from urllib.parse import quote, unquote
import traceback
import random
import json

from app.services.github_loader import clone_repo, get_code_files
from app.services.chunker import chunk_file
from app.services.embedder import embed_chunks_batch, get_client
from app.vectorstore.pgvector import store_chunks, delete_repo, get_repo_stats, get_all_indexed_repos

# Router setup
router = APIRouter(prefix="/ingest", tags=["ingest"])

# Ingestion state trackers
ingestion_status = {}    # status_key -> "processing" | "completed" | "failed"
ingestion_progress = {}  # status_key -> {"stage": str, "chunks_total": int}
ingestion_questions = {} # status_key -> list[str]


async def restore_ingestion_status() -> None:
    """
    Startup function: Restore ingestion status from PostgreSQL chunks table.

    Queries distinct repo_urls from the chunks table and marks them
    as 'completed' in the in-memory ingestion_status dict.
    """
    try:
        print("Restoring ingestion status from PostgreSQL...")
        repos = get_all_indexed_repos()

        for repo_url in repos:
            status_key = quote(repo_url, safe="")
            ingestion_status[status_key] = "completed"
            print(f"  Restored: {repo_url}")

        print(f"Restored {len(repos)} repositories from PostgreSQL")
    except Exception as e:
        print(f"Error restoring ingestion status: {e}")
        print("Continuing startup anyway...")


# ── Request / Response models ───────────────────────────────────────────────

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


# ── Helpers ──────────────────────────────────────────────────────────────────

def _set_stage(status_key: str, stage: str, chunks_total: int = 0) -> None:
    """Update the current ingestion stage for real-time progress reporting."""
    ingestion_progress[status_key] = {"stage": stage, "chunks_total": chunks_total}


def _generate_suggested_questions(chunks: list, repo_url: str) -> list:
    """
    Generate 4 repo-specific suggested questions via Gemini after indexing.
    Falls back to generic questions on any error.
    """
    try:
        repo_name = repo_url.rstrip("/").split("/")[-1]
        sample = random.sample(chunks, min(6, len(chunks)))
        code_samples = "\n\n---\n\n".join(c.get("text", "")[:400] for c in sample)

        client = get_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=(
                f'You are helping a developer explore the "{repo_name}" codebase.\n'
                f"Based on these code samples, generate exactly 4 specific questions "
                f"a developer would ask to understand this codebase.\n\n"
                f"Code samples:\n{code_samples}\n\n"
                f"Return ONLY a valid JSON array of exactly 4 question strings. "
                f'No markdown. Example: ["Q1?", "Q2?", "Q3?", "Q4?"]'
            ),
        )
        questions = json.loads(response.text.strip())
        if isinstance(questions, list) and len(questions) >= 4:
            return [str(q) for q in questions[:4]]
    except Exception as e:
        print(f"Could not generate suggested questions: {e}")

    # Fallback
    return [
        "What is the main entry point of this project?",
        "How does authentication work?",
        "What are the key dependencies?",
        "How is data stored and retrieved?",
    ]


# ── Background ingestion task ─────────────────────────────────────────────────

def _ingest_repository(repo_url: str) -> None:
    """
    Background task: Clone, chunk, embed, store repository, then
    generate repo-specific suggested questions.
    """
    status_key = quote(repo_url, safe="")
    try:
        ingestion_status[status_key] = "processing"
        print(f"Starting ingestion for {repo_url}...")

        # Step 1: Clone
        _set_stage(status_key, "Cloning repository")
        print(f"  [1/5] Cloning repository...")
        repo_path = clone_repo(repo_url)

        # Step 2: Extract files
        _set_stage(status_key, "Extracting code files")
        print(f"  [2/5] Extracting code files...")
        code_files = get_code_files(repo_path)

        if not code_files:
            raise ValueError(f"No code files found in {repo_url}")
        print(f"  Found {len(code_files)} code files")

        # Step 3: Chunk
        _set_stage(status_key, "Chunking code files")
        print(f"  [3/5] Chunking code files...")
        all_chunks = []
        for file_path in code_files:
            try:
                chunks = chunk_file(file_path)
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

        # Step 4: Embed
        _set_stage(status_key, "Embedding chunks", chunks_total=len(all_chunks))
        print(f"  [4/5] Embedding chunks...")
        embedded_chunks = embed_chunks_batch(all_chunks, batch_size=10)
        print(f"  Embedded {len(embedded_chunks)} chunks")

        # Step 5: Store
        _set_stage(status_key, "Storing in database", chunks_total=len(all_chunks))
        print(f"  [5/5] Storing in pgvector...")
        stored_count = store_chunks(embedded_chunks, repo_url)

        print(f"Successfully ingested {repo_url}: {stored_count} chunks stored")

        # Generate repo-specific suggested questions
        _set_stage(status_key, "Generating suggestions")
        print(f"  Generating suggested questions...")
        questions = _generate_suggested_questions(all_chunks, repo_url)
        ingestion_questions[status_key] = questions
        print(f"  Generated {len(questions)} suggested questions")

        ingestion_status[status_key] = "completed"

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error ingesting {repo_url}: {error_msg}")
        ingestion_status[status_key] = "failed"
        ingestion_progress.pop(status_key, None)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=IngestResponse)
async def ingest_repository(
    request: IngestRequest,
    background_tasks: BackgroundTasks
) -> IngestResponse:
    """Start repository ingestion in background."""
    if not request.repo_url or not isinstance(request.repo_url, str):
        raise HTTPException(status_code=400, detail="Invalid repo_url")

    if not ("github.com" in request.repo_url or request.repo_url.startswith("http")):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format")

    status_key = quote(request.repo_url, safe="")

    if status_key in ingestion_status:
        if ingestion_status[status_key] == "processing":
            raise HTTPException(
                status_code=409,
                detail=f"Repository {request.repo_url} is already being processed"
            )

    background_tasks.add_task(_ingest_repository, request.repo_url)
    ingestion_status[status_key] = "processing"

    return IngestResponse(status="processing", repo_url=request.repo_url)


@router.get("/status/{repo_url:path}", response_model=StatusResponse)
async def get_ingestion_status(repo_url: str) -> StatusResponse:
    """Get ingestion status (and stage details while processing) for a repository."""
    repo_url = unquote(repo_url)

    # Try multiple key formats to handle encoding mismatches
    status_key = None
    for candidate in [
        quote(repo_url, safe=""),
        quote(unquote(repo_url), safe=""),
        repo_url,
    ]:
        if candidate in ingestion_status:
            status_key = candidate
            break

    if status_key is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ingestion record found for {repo_url}"
        )

    status = ingestion_status[status_key]
    details = {}

    if status == "processing":
        # Return current stage for progress display in the UI
        details = ingestion_progress.get(status_key, {"stage": "Starting…"})

    elif status == "completed":
        try:
            stats = get_repo_stats(repo_url)
            details = {
                "total_chunks": stats.get("total_chunks", 0),
                "languages": stats.get("languages", {}),
                "file_count": len(stats.get("files", {})),
                "suggested_questions": ingestion_questions.get(status_key, []),
            }
        except Exception as e:
            print(f"Error getting stats for {repo_url}: {str(e)}")

    return StatusResponse(repo_url=repo_url, status=status, details=details)


@router.delete("/{repo_url:path}", response_model=DeleteResponse)
async def delete_ingested_repo(repo_url: str) -> DeleteResponse:
    """Delete all chunks for a repository from pgvector (PostgreSQL)."""
    repo_url = unquote(repo_url)

    try:
        chunks_deleted = delete_repo(repo_url)

        status_key = quote(repo_url, safe="")
        ingestion_status.pop(status_key, None)
        ingestion_progress.pop(status_key, None)
        ingestion_questions.pop(status_key, None)

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
    """Get status of all ongoing/completed ingestions."""
    return {unquote(k): v for k, v in ingestion_status.items()}

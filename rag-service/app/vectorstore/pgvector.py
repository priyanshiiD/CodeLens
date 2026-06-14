"""
pgvector-based vector store for CodeLens RAG service.
Replaces ChromaDB — stores and retrieves code chunk embeddings in PostgreSQL.
"""

import os
from contextlib import contextmanager
from typing import List, Dict, Any

import psycopg2
from pgvector.psycopg2 import register_vector
import numpy as np
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


@contextmanager
def _get_conn():
    """Open a connection, register pgvector, auto-commit or rollback."""
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _create_chunk_id(repo_url: str, file_path: str, start_line: int) -> str:
    repo_id = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    return f"{repo_id}:{file_path}:{start_line}"


# ── Public API (same interface as chroma.py) ───────────────────────────────


def store_chunks(chunks: List[Dict[str, Any]], repo_url: str) -> int:
    """
    Store embedded chunks in PostgreSQL via pgvector.

    Args:
        chunks: List of chunk dicts with 'embedding', 'text', 'metadata' keys.
        repo_url: GitHub repository URL.

    Returns:
        Number of chunks successfully stored.
    """
    if not chunks or not isinstance(chunks, list):
        raise ValueError("chunks must be a non-empty list")
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")

    valid_chunks = [c for c in chunks if c.get("embedding")]
    if not valid_chunks:
        print("No chunks with embeddings to store")
        return 0

    try:
        with _get_conn() as conn:
            cur = conn.cursor()
            for chunk in valid_chunks:
                meta = chunk.get("metadata", {})
                file_path  = meta.get("file_path", "unknown")
                start_line = int(meta.get("start_line", 0))
                end_line   = int(meta.get("end_line", 0))
                language   = meta.get("language", "unknown")
                chunk_id   = _create_chunk_id(repo_url, file_path, start_line)
                embedding  = np.array(chunk["embedding"], dtype=np.float32)

                cur.execute(
                    """
                    INSERT INTO chunks
                        (chunk_id, repo_url, file_path, start_line, end_line, language, text, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (chunk_id) DO UPDATE SET
                        text      = EXCLUDED.text,
                        embedding = EXCLUDED.embedding,
                        end_line  = EXCLUDED.end_line,
                        language  = EXCLUDED.language
                    """,
                    (chunk_id, repo_url, file_path, start_line, end_line,
                     language, chunk["text"], embedding),
                )

        print(f"Stored {len(valid_chunks)} chunks for {repo_url}")
        return len(valid_chunks)

    except Exception as e:
        raise Exception(f"Failed to store chunks: {e}")


def retrieve_chunks(
    query_embedding: List[float],
    repo_url: str,
    n_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieve the top-N most similar chunks for a query, filtered by repo.

    Args:
        query_embedding: 768-dim vector from Gemini embedding model.
        repo_url: Filter results to this repository.
        n_results: How many chunks to return.

    Returns:
        List of dicts with 'text', 'metadata', 'distance' keys.
    """
    if not query_embedding:
        raise ValueError("query_embedding must be a non-empty list")
    if not repo_url:
        raise ValueError("repo_url must be a non-empty string")
    if n_results < 1:
        raise ValueError("n_results must be at least 1")

    try:
        vec = np.array(query_embedding, dtype=np.float32)
        with _get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT chunk_id, text, file_path, start_line, end_line, language,
                       (embedding <=> %s) AS distance
                FROM chunks
                WHERE repo_url = %s
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                (vec, repo_url, vec, n_results),
            )
            rows = cur.fetchall()

        results = []
        for row in rows:
            chunk_id, text, file_path, start_line, end_line, language, distance = row
            results.append({
                "id": chunk_id,
                "text": text,
                "metadata": {
                    "file_path":  file_path,
                    "start_line": start_line,
                    "end_line":   end_line,
                    "language":   language,
                    "repo_url":   repo_url,
                },
                "distance": float(distance) if distance is not None else None,
            })

        return results

    except Exception as e:
        raise Exception(f"Failed to retrieve chunks: {e}")


def delete_repo(repo_url: str) -> int:
    """Delete all stored chunks for a repository."""
    if not repo_url:
        raise ValueError("repo_url must be a non-empty string")

    try:
        with _get_conn() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM chunks WHERE repo_url = %s", (repo_url,))
            deleted = cur.rowcount

        print(f"Deleted {deleted} chunks for {repo_url}")
        return deleted

    except Exception as e:
        raise Exception(f"Failed to delete repo chunks: {e}")


def get_repo_stats(repo_url: str) -> Dict[str, Any]:
    """Return chunk count, language distribution, and file list for a repo."""
    if not repo_url:
        raise ValueError("repo_url must be a non-empty string")

    try:
        with _get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT file_path, language FROM chunks WHERE repo_url = %s",
                (repo_url,),
            )
            rows = cur.fetchall()

        if not rows:
            return {"repo_url": repo_url, "total_chunks": 0, "languages": {}, "files": {}}

        languages: Dict[str, int] = {}
        files: Dict[str, int] = {}
        for file_path, language in rows:
            languages[language or "unknown"] = languages.get(language or "unknown", 0) + 1
            files[file_path] = files.get(file_path, 0) + 1

        return {
            "repo_url":     repo_url,
            "total_chunks": len(rows),
            "languages":    languages,
            "files":        files,
        }

    except Exception as e:
        raise Exception(f"Failed to get repo stats: {e}")


def get_all_indexed_repos() -> List[str]:
    """Return distinct repo URLs that have chunks stored. Used on startup."""
    try:
        with _get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT repo_url FROM chunks")
            rows = cur.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"Could not fetch indexed repos: {e}")
        return []

"""
ChromaDB vector store manager for RAG-based codebase intelligence.
Stores and retrieves code chunks with embeddings.
"""

import os
from typing import List, Dict, Any, Optional
import chromadb

# Configuration
COLLECTION_NAME = "codelens"
CHROMA_DB_PATH = "./chroma_db"

# Global client instance
_client: Optional[chromadb.Client] = None
_collection = None


def get_client():
    """
    Get or create persistent ChromaDB client.

    Returns:
        ChromaDB client instance
    """
    global _client
    if _client is None:
        os.makedirs(CHROMA_DB_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return _client


def get_collection():
    """
    Get or create the collection for storing code chunks.

    Returns:
        ChromaDB collection instance

    Raises:
        Exception: If collection creation fails
    """
    global _collection
    
    try:
        if _collection is None:
            client = get_client()
            
            # Get or create collection
            _collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
        
        return _collection
    
    except Exception as e:
        raise Exception(f"Failed to get collection: {str(e)}")


def _create_chunk_id(repo_url: str, file_path: str, start_line: int) -> str:
    """
    Create unique ID for a chunk.

    Args:
        repo_url: Repository URL
        file_path: File path from metadata
        start_line: Starting line number

    Returns:
        Unique string ID
    """
    # Normalize repo_url
    repo_id = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    
    # Create unique ID
    chunk_id = f"{repo_id}:{file_path}:{start_line}"
    
    return chunk_id


def store_chunks(chunks: List[Dict[str, Any]], repo_url: str) -> int:
    """
    Store embedded chunks in ChromaDB.

    Args:
        chunks: List of chunk dicts with "embedding" key (from embedder.py)
        repo_url: Repository URL for metadata tracking

    Returns:
        Number of chunks successfully stored

    Raises:
        ValueError: If chunks list is invalid
        Exception: If storage fails
    """
    if not chunks or not isinstance(chunks, list):
        raise ValueError("Chunks must be a non-empty list")
    
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")
    
    try:
        collection = get_collection()
        
        # Filter chunks with embeddings
        valid_chunks = [
            chunk for chunk in chunks 
            if "embedding" in chunk and chunk["embedding"]
        ]
        
        if not valid_chunks:
            print("No chunks with embeddings found to store")
            return 0
        
        # Prepare data for ChromaDB
        ids = []
        embeddings = []
        documents = []
        metadatas = []
        
        for chunk in valid_chunks:
            metadata = chunk.get("metadata", {})
            file_path = metadata.get("file_path", "unknown")
            start_line = metadata.get("start_line", 0)
            
            # Create unique ID
            chunk_id = _create_chunk_id(repo_url, file_path, start_line)
            
            # Prepare metadata with repo_url
            full_metadata = metadata.copy()
            full_metadata["repo_url"] = repo_url
            
            ids.append(chunk_id)
            embeddings.append(chunk["embedding"])
            documents.append(chunk["text"])
            metadatas.append(full_metadata)
        
        # Store in ChromaDB
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        
        print(f"Successfully stored {len(valid_chunks)} chunks for {repo_url}")
        return len(valid_chunks)
    
    except Exception as e:
        raise Exception(f"Failed to store chunks: {str(e)}")


def retrieve_chunks(
    query_embedding: List[float],
    repo_url: str,
    n_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieve similar chunks from ChromaDB.

    Args:
        query_embedding: Query embedding vector
        repo_url: Filter results by repository
        n_results: Number of results to return

    Returns:
        List of dicts with text and metadata of similar chunks

    Raises:
        ValueError: If query_embedding is invalid
        Exception: If retrieval fails
    """
    if not query_embedding or not isinstance(query_embedding, list):
        raise ValueError("query_embedding must be a non-empty list")
    
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")
    
    if n_results < 1:
        raise ValueError("n_results must be at least 1")
    
    try:
        collection = get_collection()
        
        # Query with metadata filter for repo_url
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where={"repo_url": repo_url},
        )
        
        # Format results
        retrieved_chunks = []
        
        if results and results["ids"] and len(results["ids"]) > 0:
            for i, chunk_id in enumerate(results["ids"][0]):
                retrieved_chunk = {
                    "id": chunk_id,
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if results["distances"] else None,
                }
                retrieved_chunks.append(retrieved_chunk)
        
        return retrieved_chunks
    
    except Exception as e:
        raise Exception(f"Failed to retrieve chunks: {str(e)}")


def delete_repo(repo_url: str) -> int:
    """
    Delete all chunks for a specific repository.

    Args:
        repo_url: Repository URL to delete

    Returns:
        Number of chunks deleted

    Raises:
        ValueError: If repo_url is invalid
        Exception: If deletion fails
    """
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")
    
    try:
        collection = get_collection()
        
        # Get all chunks for this repo
        results = collection.get(
            where={"repo_url": repo_url}
        )
        
        if not results or not results["ids"]:
            print(f"No chunks found for repository: {repo_url}")
            return 0
        
        # Delete chunks
        chunk_ids = results["ids"]
        collection.delete(
            ids=chunk_ids
        )
        
        print(f"Deleted {len(chunk_ids)} chunks for {repo_url}")
        return len(chunk_ids)
    
    except Exception as e:
        raise Exception(f"Failed to delete repository chunks: {str(e)}")


def get_repo_stats(repo_url: str) -> Dict[str, Any]:
    """
    Get statistics about stored chunks for a repository.

    Args:
        repo_url: Repository URL

    Returns:
        Dictionary with statistics

    Raises:
        Exception: If retrieval fails
    """
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")
    
    try:
        collection = get_collection()
        
        # Get all chunks for this repo
        results = collection.get(
            where={"repo_url": repo_url}
        )
        
        if not results or not results["ids"]:
            return {
                "repo_url": repo_url,
                "total_chunks": 0,
                "languages": {},
                "files": {}
            }
        
        # Calculate statistics
        chunk_ids = results["ids"]
        metadatas = results["metadatas"]
        
        languages = {}
        files = {}
        
        for metadata in metadatas:
            # Count by language
            language = metadata.get("language", "unknown")
            languages[language] = languages.get(language, 0) + 1
            
            # Count by file
            file_path = metadata.get("file_path", "unknown")
            files[file_path] = files.get(file_path, 0) + 1
        
        return {
            "repo_url": repo_url,
            "total_chunks": len(chunk_ids),
            "languages": languages,
            "files": files,
        }
    
    except Exception as e:
        raise Exception(f"Failed to get repository stats: {str(e)}")


def clear_collection() -> None:
    """
    Delete entire collection (careful - removes all data).

    Raises:
        Exception: If deletion fails
    """
    global _collection
    
    try:
        client = get_client()
        client.delete_collection(name=COLLECTION_NAME)
        _collection = None
        print(f"Collection '{COLLECTION_NAME}' deleted")
    
    except Exception as e:
        raise Exception(f"Failed to clear collection: {str(e)}")

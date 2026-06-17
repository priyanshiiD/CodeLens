"""
Code embedder for RAG-based codebase intelligence.
Converts code chunks into vector embeddings using Google Generative AI.
"""

import os
import time
from typing import List, Dict, Any
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = "gemini-embedding-001"
MAX_RETRIES = 3
RETRY_DELAY = 1  # Seconds between retries

# Global client instance
_client = None


def get_client():
    """
    Get or create Google Generative AI client.

    Returns:
        genai.Client instance

    Raises:
        ValueError: If GEMINI_API_KEY is not set
    """
    global _client
    
    if _client is None:
        if not GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables. "
                "Please set it in your .env file."
            )
        _client = genai.Client(api_key=GEMINI_API_KEY)
    
    return _client


def embed_text(text: str, retries: int = 0) -> List[float]:
    """
    Convert text into embedding vector using Google Generative AI.

    Args:
        text: Text to embed
        retries: Current retry attempt (internal use)

    Returns:
        Embedding vector as list of floats

    Raises:
        ValueError: If text is empty
        Exception: If embedding fails after max retries
    """
    if not text or not isinstance(text, str):
        raise ValueError("Text must be a non-empty string")
    
    try:
        # Get client
        client = get_client()
        
        # Generate embedding
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        
        if not response.embeddings or not response.embeddings[0].values:
            raise ValueError("Empty embedding returned from API")
        
        return response.embeddings[0].values
    
    except Exception as e:
        # Retry logic
        if retries < MAX_RETRIES:
            print(
                f"Embedding failed (attempt {retries + 1}/{MAX_RETRIES}), "
                f"retrying in {RETRY_DELAY}s... Error: {str(e)}"
            )
            time.sleep(RETRY_DELAY)
            return embed_text(text, retries + 1)
        else:
            raise Exception(
                f"Failed to embed text after {MAX_RETRIES} attempts: {str(e)}"
            )


def embed_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Embed all chunks by adding embedding vectors to each chunk.

    Args:
        chunks: List of chunk dicts from chunker.py with 'text' key

    Returns:
        Updated chunks list with 'embedding' key added to each chunk

    Raises:
        ValueError: If chunks is empty or invalid
        Exception: If embedding process fails
    """
    if not chunks or not isinstance(chunks, list):
        raise ValueError("Chunks must be a non-empty list")
    
    # Validate chunk structure
    for i, chunk in enumerate(chunks):
        if not isinstance(chunk, dict) or "text" not in chunk:
            raise ValueError(
                f"Invalid chunk at index {i}: "
                f"must be dict with 'text' key"
            )
    
    print(f"Starting to embed {len(chunks)} chunks...")
    embedded_chunks = []
    
    for i, chunk in enumerate(chunks):
        try:
            # Generate embedding for chunk text
            embedding = embed_text(chunk["text"])
            
            # Create new chunk dict with embedding
            embedded_chunk = chunk.copy()
            embedded_chunk["embedding"] = embedding
            embedded_chunks.append(embedded_chunk)
            
            # Print progress every 10 chunks
            if (i + 1) % 10 == 0:
                print(f"Embedded {i + 1}/{len(chunks)} chunks")
        
        except Exception as e:
            print(
                f"Error embedding chunk {i} "
                f"({chunk.get('metadata', {}).get('file_path', 'unknown')}): "
                f"{str(e)}"
            )
            raise
    
    print(f"Successfully embedded all {len(embedded_chunks)} chunks")
    return embedded_chunks


def embed_text_batch(texts: List[str], retries: int = 0) -> List[List[float]]:
    """
    Generate embeddings for a list of texts in a single batch request to Google AI.
    """
    if not texts:
        return []
    
    try:
        client = get_client()
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
        )
        
        if not response.embeddings:
            raise ValueError("No embeddings returned from API")
            
        return [emb.values for emb in response.embeddings]
        
    except Exception as e:
        if retries < MAX_RETRIES:
            delay = 5 if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) else RETRY_DELAY
            print(
                f"Batch embedding failed (attempt {retries + 1}/{MAX_RETRIES}), "
                f"retrying in {delay}s... Error: {str(e)}"
            )
            time.sleep(delay)
            return embed_text_batch(texts, retries + 1)
        else:
            raise Exception(
                f"Failed to embed text batch after {MAX_RETRIES} attempts: {str(e)}"
            )


def embed_chunks_batch(
    chunks: List[Dict[str, Any]], 
    batch_size: int = 15,
    delay_between_batches: float = 4.0
) -> List[Dict[str, Any]]:
    """
    Embed chunks in batches using native batching to avoid Gemini 15 RPM rate limit.
    """
    if not chunks or not isinstance(chunks, list):
        raise ValueError("Chunks must be a non-empty list")
    
    print(
        f"Starting batch embedding of {len(chunks)} chunks "
        f"(batch size: {batch_size}, delay: {delay_between_batches}s)..."
    )
    embedded_chunks = []
    
    for batch_start in range(0, len(chunks), batch_size):
        batch_end = min(batch_start + batch_size, len(chunks))
        batch = chunks[batch_start:batch_end]
        
        # Prepare list of texts to embed
        texts = [chunk["text"] for chunk in batch]
        
        try:
            # Get embeddings in a single API request
            embeddings = embed_text_batch(texts)
            
            # Match embeddings back to chunks
            for idx, embedding in enumerate(embeddings):
                embedded_chunk = batch[idx].copy()
                embedded_chunk["embedding"] = embedding
                embedded_chunks.append(embedded_chunk)
                
        except Exception as e:
            print(
                f"Error embedding batch starting at {batch_start}: {str(e)}"
            )
            raise
            
        current_count = min(batch_end, len(chunks))
        print(
            f"Completed batch: {current_count}/{len(chunks)} chunks embedded"
        )
        
        # Delay between batches (except after last batch)
        if batch_end < len(chunks):
            time.sleep(delay_between_batches)
            
    print(f"Batch embedding complete: {len(embedded_chunks)} chunks")
    return embedded_chunks


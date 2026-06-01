"""
Retriever for RAG-based codebase intelligence.
Embeds user questions, retrieves relevant code chunks, and generates answers using Gemini.
"""

import os
from typing import List, Dict, Any
from google import genai
from dotenv import load_dotenv

from app.services.embedder import embed_text
from app.vectorstore.chroma import retrieve_chunks

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

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


def build_prompt(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Build a prompt for Gemini with context from retrieved chunks.

    Args:
        question: User's question
        chunks: List of retrieved chunk dicts with text and metadata

    Returns:
        Formatted prompt string

    Raises:
        ValueError: If question or chunks are invalid
    """
    if not question or not isinstance(question, str):
        raise ValueError("Question must be a non-empty string")
    
    if not isinstance(chunks, list):
        raise ValueError("Chunks must be a list")
    
    # Build context from chunks
    context_parts = []
    
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        
        metadata = chunk.get("metadata", {})
        file_path = metadata.get("file_path", "unknown")
        start_line = metadata.get("start_line", "?")
        end_line = metadata.get("end_line", "?")
        text = chunk.get("text", "")
        
        if text:
            context_parts.append(
                f"[File: {file_path}, Lines: {start_line}-{end_line}]\n{text}"
            )
    
    # Build final prompt
    context_str = "\n\n".join(context_parts)
    
    prompt = f"""You are a senior software engineer helping understand a codebase.

Instructions:
- Answer the question using ONLY the provided context
- If the answer is not in the context, say so clearly
- Provide specific file names and line numbers when referencing code
- Be concise and technical

Context:
{context_str}

Question: {question}"""
    
    return prompt


def ask(
    question: str,
    repo_url: str,
    n_results: int = 5,
) -> Dict[str, Any]:
    """
    Answer a question about a codebase using RAG.

    Args:
        question: User's question about the codebase
        repo_url: Repository URL to query
        n_results: Number of relevant chunks to retrieve

    Returns:
        Dictionary with:
        - answer: Generated answer from Gemini
        - sources: List of dicts with file_path and line range
        - chunks_used: Number of chunks used

    Raises:
        ValueError: If question or repo_url are invalid
        Exception: If embedding, retrieval, or API call fails
    """
    if not question or not isinstance(question, str):
        raise ValueError("Question must be a non-empty string")
    
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("repo_url must be a non-empty string")
    
    if n_results < 1:
        raise ValueError("n_results must be at least 1")
    
    try:
        # Initialize Gemini
        client = get_client()
        
        # Step 1: Embed the question
        print(f"Embedding question: {question[:50]}...")
        question_embedding = embed_text(question)
        
        # Step 2: Retrieve relevant chunks
        print(f"Retrieving top {n_results} relevant chunks...")
        retrieved_chunks = retrieve_chunks(
            query_embedding=question_embedding,
            repo_url=repo_url,
            n_results=n_results,
        )
        
        if not retrieved_chunks:
            return {
                "answer": "No relevant code chunks found in the repository for this question.",
                "sources": [],
                "chunks_used": 0,
            }
        
        # Step 3: Build prompt with context
        prompt = build_prompt(question, retrieved_chunks)
        
        # Step 4: Call Gemini API
        print("Generating answer with Gemini...")
        client = get_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        
        if not response:
            raise Exception("Empty response from Gemini API")
        
        # Extract text from response
        if hasattr(response, 'text'):
            answer = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            answer = response.candidates[0].content.parts[0].text
        else:
            raise Exception("Could not extract text from Gemini response")
        
        if not answer:
            raise Exception("Empty answer from Gemini API")
        
        # Step 5: Extract sources from chunks
        sources = []
        for chunk in retrieved_chunks:
            metadata = chunk.get("metadata", {})
            file_path = metadata.get("file_path", "unknown")
            start_line = metadata.get("start_line", "?")
            end_line = metadata.get("end_line", "?")
            
            # Only add unique sources
            source = {
                "file_path": file_path,
                "start_line": start_line,
                "end_line": end_line,
            }
            
            if source not in sources:
                sources.append(source)
        
        return {
            "answer": answer,
            "sources": sources,
            "chunks_used": len(retrieved_chunks),
        }
    
    except ValueError as e:
        raise ValueError(f"Invalid input: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to answer question: {str(e)}")


def ask_batch(
    questions: List[str],
    repo_url: str,
    n_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Answer multiple questions about a codebase.

    Args:
        questions: List of questions
        repo_url: Repository URL to query
        n_results: Number of relevant chunks per question

    Returns:
        List of answer dicts

    Raises:
        ValueError: If inputs are invalid
        Exception: If processing fails
    """
    if not questions or not isinstance(questions, list):
        raise ValueError("Questions must be a non-empty list")
    
    results = []
    
    for i, question in enumerate(questions, 1):
        try:
            print(f"\n--- Question {i}/{len(questions)} ---")
            result = ask(question, repo_url, n_results)
            results.append(result)
        except Exception as e:
            print(f"Error processing question '{question}': {str(e)}")
            results.append({
                "answer": f"Error: {str(e)}",
                "sources": [],
                "chunks_used": 0,
            })
    
    return results

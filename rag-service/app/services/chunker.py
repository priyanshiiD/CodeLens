"""
Code file chunker for RAG-based codebase intelligence.
Splits code files into meaningful chunks at function and class boundaries.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any


# Language detection based on file extensions
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".go": "go",
}

# Configuration
MAX_CHUNK_SIZE = 100  # Maximum lines per chunk
MIN_CHUNK_SIZE = 5    # Minimum lines per chunk (skip smaller)
FALLBACK_CHUNK_SIZE = 50  # Lines per chunk in fallback mode
FALLBACK_OVERLAP = 10  # Line overlap in fallback mode


def get_language(file_path: str) -> str:
    """
    Detect programming language from file extension.

    Args:
        file_path: Path to the code file

    Returns:
        Language identifier string
    """
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_MAP.get(ext, "unknown")


def detect_python_definitions(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Detect function and class definitions in Python code.

    Args:
        lines: List of code lines

    Returns:
        List of detected definitions with their line numbers
    """
    definitions = []
    
    for i, line in enumerate(lines):
        stripped = line.lstrip()
        
        # Detect class definition
        if stripped.startswith("class "):
            match = re.match(r"class\s+(\w+)", stripped)
            if match:
                definitions.append({
                    "type": "class",
                    "name": match.group(1),
                    "start_line": i,
                })
        
        # Detect function definition
        elif stripped.startswith("def "):
            match = re.match(r"def\s+(\w+)", stripped)
            if match:
                definitions.append({
                    "type": "function",
                    "name": match.group(1),
                    "start_line": i,
                })
    
    return definitions


def detect_js_ts_definitions(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Detect function and class definitions in JavaScript/TypeScript code.

    Args:
        lines: List of code lines

    Returns:
        List of detected definitions with their line numbers
    """
    definitions = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Detect class definition
        if re.search(r"\bclass\s+(\w+)", stripped):
            match = re.search(r"\bclass\s+(\w+)", stripped)
            if match:
                definitions.append({
                    "type": "class",
                    "name": match.group(1),
                    "start_line": i,
                })
        
        # Detect function keyword
        elif re.search(r"\bfunction\s+(\w+)", stripped):
            match = re.search(r"\bfunction\s+(\w+)", stripped)
            if match:
                definitions.append({
                    "type": "function",
                    "name": match.group(1),
                    "start_line": i,
                })
        
        # Detect const/let/var with function (arrow functions, etc.)
        elif re.search(r"\b(const|let|var)\s+(\w+)\s*=", stripped):
            match = re.search(r"\b(const|let|var)\s+(\w+)\s*=", stripped)
            if match and ("=>" in stripped or "function" in stripped):
                definitions.append({
                    "type": "function",
                    "name": match.group(2),
                    "start_line": i,
                })
    
    return definitions


def create_chunks_from_definitions(
    lines: List[str], definitions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Create chunks based on detected function/class definitions.

    Args:
        lines: List of code lines
        definitions: List of detected definitions

    Returns:
        List of chunks with boundaries set
    """
    if not definitions:
        return []
    
    chunks = []
    total_lines = len(lines)
    
    for i, definition in enumerate(definitions):
        start_line = definition["start_line"]
        
        # End line is the next definition's start or end of file
        if i + 1 < len(definitions):
            end_line = definitions[i + 1]["start_line"] - 1
        else:
            end_line = total_lines - 1
        
        # Enforce max chunk size
        if end_line - start_line + 1 > MAX_CHUNK_SIZE:
            end_line = start_line + MAX_CHUNK_SIZE - 1
        
        # Skip if chunk is too small
        if end_line - start_line + 1 < MIN_CHUNK_SIZE:
            continue
        
        chunk_text = "\n".join(lines[start_line : end_line + 1])
        
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "chunk_type": definition["type"],
                "name": definition.get("name", ""),
                "start_line": start_line + 1,  # Convert to 1-based
                "end_line": end_line + 1,      # Convert to 1-based
            },
        })
    
    return chunks


def create_fallback_chunks(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Create chunks using fallback strategy (sliding window approach).
    Used when no function/class definitions are detected.

    Args:
        lines: List of code lines

    Returns:
        List of chunks with sliding window approach
    """
    chunks = []
    total_lines = len(lines)
    
    if total_lines < MIN_CHUNK_SIZE:
        # Entire file is a single chunk if it meets minimum size
        chunk_text = "\n".join(lines)
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "chunk_type": "block",
                "name": "",
                "start_line": 1,
                "end_line": total_lines,
            },
        })
        return chunks
    
    # Create overlapping chunks
    start = 0
    while start < total_lines:
        end = min(start + FALLBACK_CHUNK_SIZE, total_lines)
        
        # Skip if chunk is too small
        if end - start < MIN_CHUNK_SIZE:
            break
        
        chunk_text = "\n".join(lines[start:end])
        
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "chunk_type": "block",
                "name": "",
                "start_line": start + 1,      # Convert to 1-based
                "end_line": end,              # Convert to 1-based
            },
        })
        
        # Move start position with overlap
        start += FALLBACK_CHUNK_SIZE - FALLBACK_OVERLAP
    
    return chunks


def chunk_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Split a code file into meaningful chunks at function and class boundaries.

    Args:
        file_path: Path to the code file

    Returns:
        List of chunk dictionaries with text and metadata

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If file is empty or unreadable
    """
    # Validate file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Read file
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        # Fallback to another encoding if UTF-8 fails
        try:
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()
        except Exception as e:
            raise ValueError(f"Cannot read file {file_path}: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error reading file {file_path}: {str(e)}")
    
    # Validate content
    if not content or not content.strip():
        raise ValueError(f"File is empty: {file_path}")
    
    # Split into lines
    lines = content.split("\n")
    
    # Detect language
    language = get_language(file_path)
    
    # Detect definitions based on language
    definitions = []
    if language == "python":
        definitions = detect_python_definitions(lines)
    elif language in ["javascript", "typescript"]:
        definitions = detect_js_ts_definitions(lines)
    
    # Create chunks from definitions or use fallback
    if definitions:
        chunks = create_chunks_from_definitions(lines, definitions)
    else:
        chunks = create_fallback_chunks(lines)
    
    # Add common metadata to all chunks
    relative_path = file_path.replace("\\", "/")  # Normalize path separators
    for chunk in chunks:
        chunk["metadata"]["file_path"] = relative_path
        chunk["metadata"]["language"] = language
    
    return chunks


def chunk_directory(
    dir_path: str, file_extensions: set = None
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Recursively chunk all code files in a directory.

    Args:
        dir_path: Path to the directory
        file_extensions: Set of file extensions to process (e.g., {'.py', '.js'})
                        If None, uses all supported extensions

    Returns:
        Dictionary mapping file paths to their chunks

    Raises:
        ValueError: If directory doesn't exist
    """
    if not os.path.isdir(dir_path):
        raise ValueError(f"Directory not found: {dir_path}")
    
    if file_extensions is None:
        file_extensions = set(LANGUAGE_MAP.keys())
    
    results = {}
    
    for root, dirs, files in os.walk(dir_path):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in {
            'node_modules', 'dist', 'build', '.git', 
            '__pycache__', 'venv', '.venv'
        }]
        
        for file in files:
            file_path = os.path.join(root, file)
            
            # Check if file extension is supported
            if Path(file_path).suffix.lower() not in file_extensions:
                continue
            
            try:
                chunks = chunk_file(file_path)
                if chunks:
                    results[file_path] = chunks
            except (FileNotFoundError, ValueError) as e:
                print(f"Warning: Skipped {file_path}: {str(e)}")
                continue
    
    return results

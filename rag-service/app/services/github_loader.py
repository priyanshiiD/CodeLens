"""
GitHub repository cloner and file extractor for RAG-based codebase intelligence.
"""

import os
import tempfile
from pathlib import Path
from typing import List
from git import Repo
from git.exc import GitCommandError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SKIP_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    "__pycache__",
    "venv",
    ".venv",
}

CODE_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".java",
    ".cpp",
    ".c",
    ".go",
}


def clone_repo(repo_url: str) -> str:
    """
    Clone a GitHub repository to a temporary directory.

    Args:
        repo_url: Full GitHub repository URL

    Returns:
        Local path of the cloned repository

    Raises:
        ValueError: If repo_url is invalid or empty
        GitCommandError: If cloning fails
    """
    if not repo_url or not isinstance(repo_url, str):
        raise ValueError("Invalid repo_url: must be a non-empty string")

    try:
        # Extract repo name from URL
        repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
        
        # Create temp directory path
        temp_dir = os.path.join(tempfile.gettempdir(), "repos", repo_name)
        
        # Create parent directory if it doesn't exist
        os.makedirs(os.path.dirname(temp_dir), exist_ok=True)
        
        # If already cloned, return existing path
        if os.path.exists(temp_dir):
            print(f"Repository already exists at: {temp_dir}")
            return temp_dir
        
        # Clone the repository
        print(f"Cloning repository: {repo_url}")
        Repo.clone_from(repo_url, temp_dir)
        
        print(f"Repository cloned successfully to: {temp_dir}")
        return temp_dir
    
    except GitCommandError as e:
        raise GitCommandError(
            f"Failed to clone repository {repo_url}: {str(e)}"
        )
    except Exception as e:
        raise Exception(f"Unexpected error while cloning repository: {str(e)}")


def get_code_files(repo_path: str) -> List[str]:
    """
    Recursively walk through repository and return all source code files.

    Args:
        repo_path: Local path to the cloned repository

    Returns:
        List of absolute paths to source code files

    Raises:
        ValueError: If repo_path is invalid or doesn't exist
    """
    if not repo_path or not isinstance(repo_path, str):
        raise ValueError("Invalid repo_path: must be a non-empty string")
    
    repo_path = Path(repo_path)
    
    if not repo_path.exists():
        raise ValueError(f"Repository path does not exist: {repo_path}")
    
    if not repo_path.is_dir():
        raise ValueError(f"Repository path is not a directory: {repo_path}")
    
    code_files = []
    
    try:
        for root, dirs, files in os.walk(repo_path):
            # Remove skip directories from dirs in-place to prevent traversal
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            # Check each file
            for file in files:
                file_path = Path(root) / file
                
                # Check if file has a supported extension
                if file_path.suffix.lower() in CODE_EXTENSIONS:
                    code_files.append(str(file_path))
        
        print(f"Found {len(code_files)} source code files")
        return code_files
    
    except Exception as e:
        raise Exception(f"Error while scanning repository: {str(e)}")


if __name__ == "__main__":
    # Example usage
    try:
        repo_url = "https://github.com/example/repo.git"
        repo_path = clone_repo(repo_url)
        files = get_code_files(repo_path)
        print(f"Total files found: {len(files)}")
        for file in files[:5]:  # Print first 5 files
            print(f"  - {file}")
    except Exception as e:
        print(f"Error: {e}")
from dotenv import load_dotenv
load_dotenv()

from app.services.github_loader import clone_repo, get_code_files
from app.services.chunker import chunk_file
from app.services.embedder import embed_chunks_batch
from app.vectorstore.chroma import store_chunks
from app.services.retriever import ask

# Test with a small repo
REPO_URL = "https://github.com/expressjs/express"

print("Step 1: Cloning repo...")
repo_path = clone_repo(REPO_URL)

print("Step 2: Getting files...")
files = get_code_files(repo_path)
print(f"Found {len(files)} files")

print("Step 3: Chunking first 5 files only...")
all_chunks = []
for file in files[:5]:
    try:
        chunks = chunk_file(file)
        all_chunks.extend(chunks)
    except Exception as e:
        print(f"Skipped {file}: {e}")

print(f"Total chunks: {len(all_chunks)}")

print("Step 4: Embedding chunks...")
embedded = embed_chunks_batch(all_chunks, batch_size=5)

print("Step 5: Storing in ChromaDB...")
store_chunks(embedded, REPO_URL)

print("Step 6: Asking question...")
result = ask("How are routes registered?", REPO_URL)

print("\n--- ANSWER ---")
print(result["answer"])
print("\n--- SOURCES ---")
for source in result["sources"]:
    print(f"  {source['file_path']} lines {source['start_line']}-{source['end_line']}")
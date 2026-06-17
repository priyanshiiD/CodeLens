# CodeLens — AI Codebase Intelligence

> **Ask questions about any GitHub repository in plain English. Get answers with exact source citations.**

🔗 **Live Demo:** [code-lens-iota.vercel.app](https://code-lens-iota.vercel.app)

CodeLens is a full-stack RAG (Retrieval-Augmented Generation) application that lets you have a natural language conversation with any codebase. Paste a GitHub URL, and within minutes you can ask "How does authentication work?", "Explain the folder structure", or "Where is the database connection configured?" — and get accurate, cited answers.

---

## ✨ Features

- 🔗 **GitHub Integration** — Paste any public GitHub repo URL to start indexing
- 🧠 **Semantic Search** — Embeddings-powered retrieval finds the most relevant code chunks
- 💬 **Conversational UI** — Chat interface with persistent history across sessions  
- 📁 **Source Citations** — Every answer links to the exact file and line number on GitHub
- ⚡ **Real-time Status** — Live indexing progress with auto-refresh
- 🔐 **Auth System** — JWT-based authentication with bcrypt password hashing
- 🎨 **Premium Dark UI** — GitHub-inspired dark theme with glassmorphism

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│              Vite + React Router + Tailwind CSS         │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP (JWT Auth)
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Node.js + Express)            │
│         JWT Auth · PostgreSQL · Repo Management        │
└──────────┬──────────────────────────────┬──────────────┘
           │ SQL                          │ HTTP
           ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│             PostgreSQL Database (pgvector)              │
│  · users        · repos        · chat_history           │
│  · chunks (stores embeddings & code text)              │
└──────────▲──────────────────────────────┬──────────────┘
           │ SQL (Read/Write Chunks)      │
           │                              ▼
           │                    ┌────────────────────────┐
           │                    │ RAG Service (FastAPI)  │
           │                    │                        │
           └────────────────────┼─ 1. Clone (GitPython)  │
                                │  2. Chunk code files   │
                                │  3. Embed (Gemini API) │
                                │  4. Query embeddings   │
                                │  5. LLM Answer Gen     │
                                └────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, JWT, bcrypt |
| RAG Service | Python, FastAPI, GitPython |
| LLM | Gemini 2.5 Flash (Google AI) |
| Embeddings | `gemini-embedding-001` |
| Vector DB | pgvector (PostgreSQL Extension) |
| Database | PostgreSQL (Neon / Supabase) |
| Auth | JWT (7-day expiry) + bcrypt |

---

## 🚀 Local Setup

### ⚡ Option A — Docker (Recommended, one command)

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop)

```bash
# 1. Clone
git clone https://github.com/priyanshiiD/CodeLens.git
cd CodeLens

# 2. Set your Gemini API key
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY=your-key-here

# 3. Start everything (first run ~5 min to download base images)
docker-compose up --build
```

Open **http://localhost:5173** — PostgreSQL, backend, RAG service, and frontend all start automatically.

---

### 🔧 Option B — Manual Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/priyanshiiD/CodeLens.git
cd CodeLens
```

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET

# RAG Service
cp rag-service/.env.example rag-service/.env
# Edit rag-service/.env with your GEMINI_API_KEY
```

Get your Gemini API key free at: https://aistudio.google.com/apikey

### 3. Set up the database

```bash
# Create a PostgreSQL database named 'codelens'
psql -U postgres -c "CREATE DATABASE codelens;"

# Run the schema
psql -U postgres -d codelens -f backend/schema.sql
```

### 4. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# RAG Service
cd ../rag-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

### 5. Start all three services

Open **3 terminals** in the project root:

```bash
# Terminal 1 — RAG Service (port 8000)
cd rag-service && python main.py

# Terminal 2 — Backend API (port 3000)
cd backend && npm run dev

# Terminal 3 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**

### Demo Account
```
Email:    test@test.com
Password: test123
```

---

## 📁 Project Structure

```
CodeLens/
├── frontend/               # React app (Vite)
│   ├── src/
│   │   ├── pages/          # Login, Register, Dashboard, Chat
│   │   ├── components/     # UI, layout, chat components
│   │   ├── api/            # Axios client + interceptors
│   │   ├── context/        # Auth context
│   │   └── utils/          # Format helpers, chat utils
│   └── index.html
│
├── backend/                # Node.js + Express API
│   └── src/
│       ├── routes/         # auth, repos, chat
│       ├── controllers/    # Business logic
│       ├── middleware/      # JWT protect
│       └── config/         # DB pool
│
└── rag-service/            # Python FastAPI
    └── app/
        ├── api/            # ingest.py, chat.py endpoints
        ├── services/       # chunker, embedder, retriever, github_loader
        └── vectorstore/    # pgvector database manager
```

---

## 🌐 Deployment

| Service | Platform | Free Tier | Notes |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | ✅ Yes | Automated Git deployments from `/frontend` |
| **Backend API** | [Render](https://render.com) | ✅ Yes | Express API server, sleeps after 15 mins of inactivity |
| **RAG Service** | [Render](https://render.com) | ✅ Yes | FastAPI Python server, connects to PostgreSQL |
| **Database & Vector DB** | [Neon](https://neon.tech) / [Supabase](https://supabase.com) | ✅ Yes | PostgreSQL database with `pgvector` extension enabled |

> **Note:** Embeddings are stored in the database utilizing the `pgvector` extension, removing the need for a separate vector database instance or persistent file storage on Render.

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register   — Create account
POST /api/auth/login      — Login, returns JWT
```

### Repositories
```
GET    /api/repos             — List user's repos
POST   /api/repos             — Add & start indexing
GET    /api/repos/status      — Poll indexing status
DELETE /api/repos             — Remove repo + vectors
```

### Chat
```
POST /api/chat          — Ask question, get answer + sources
GET  /api/chat/history  — Load conversation history
```

---


## 📄 License

MIT — see [LICENSE](./LICENSE)

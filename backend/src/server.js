const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const repoRoutes = require("./routes/repos");
const chatRoutes = require("./routes/chat");
const pool = require("./config/db");
const { warmRagService } = require("./services/ragClient");

dotenv.config();

// Prevent idle-connection crashes: Neon serverless terminates connections after
// a few minutes of inactivity. Without this handler, the dropped connection
// emits an unhandled 'error' event that crashes the Node.js process.
pool.on("error", (err) => {
  console.error("DB pool error (connection dropped by Neon):", err.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,        // e.g. https://codelens-xyz.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Render health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(o => origin.startsWith(o))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/rag/warmup", async (req, res) => {
  try {
    await warmRagService();
    return res.json({ status: "ready" });
  } catch (error) {
    console.error("RAG warmup error:", error.code || error.message);
    return res.status(202).json({
      status: "warming",
      error: error.code || error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({ service: "CodeLens Backend", status: "running" });
});

async function startServer() {
  try {
    // Use pool.query instead of pool.connect so no persistent connection is
    // held after startup — prevents crashes when Neon drops idle connections.
    await pool.query("SELECT 1");
    await pool.query("ALTER TABLE repos ADD COLUMN IF NOT EXISTS suggested_questions JSONB DEFAULT '[]'");
    console.log("Connected to PostgreSQL and database schema verified successfully");

    app.listen(PORT, () => {
      console.log(`CodeLens Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();

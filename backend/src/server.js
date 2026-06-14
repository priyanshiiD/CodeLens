const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const repoRoutes = require("./routes/repos");
const chatRoutes = require("./routes/chat");
const pool = require("./config/db");

dotenv.config();

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

app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({ service: "CodeLens Backend", status: "running" });
});

async function startServer() {
  try {
    await pool.connect();
    console.log("Connected to PostgreSQL successfully");

    app.listen(PORT, () => {
      console.log(`CodeLens Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();

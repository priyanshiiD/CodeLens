const axios = require('axios');
const pool = require('../config/db');

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

async function askQuestion(req, res) {
  try {
    const { repo_url, question } = req.body || {};
    const userId = req.user.userId;

    if (!repo_url || !question) {
      return res.status(400).json({ error: 'repo_url and question are required' });
    }

    // Verify repo belongs to user
    const repoCheck = await pool.query(
      'SELECT id FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    const repoId = repoCheck.rows[0].id;

    // Call RAG service
    let ragResponse;
    try {
      ragResponse = await axios.post(`${RAG_SERVICE_URL}/api/chat`, {
        repo_url,
        question,
        n_results: 5,
      });
    } catch (err) {
      console.error('RAG service error:', err.message);
      return res.status(503).json({ error: 'RAG service unavailable' });
    }

    const { answer, sources, chunks_used } = ragResponse.data;

    // Save to chat_history
    await pool.query(
      'INSERT INTO chat_history (user_id, repo_id, question, answer, sources) VALUES ($1, $2, $3, $4, $5)',
      [userId, repoId, question, answer, JSON.stringify(sources || [])]
    );

    return res.json({ answer, sources, chunks_used });
  } catch (err) {
    console.error('Ask question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getChatHistory(req, res) {
  try {
    const { repo_url } = req.query || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url query param is required' });
    }

    // Get repo
    const repoCheck = await pool.query(
      'SELECT id FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    const repoId = repoCheck.rows[0].id;

    // Get chat history (last 20)
    const result = await pool.query(
      'SELECT id, question, answer, sources, created_at FROM chat_history WHERE user_id = $1 AND repo_id = $2 ORDER BY created_at DESC LIMIT 20',
      [userId, repoId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Get chat history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  askQuestion,
  getChatHistory,
};

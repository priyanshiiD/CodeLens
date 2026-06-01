const axios = require('axios');
const pool = require('../config/db');

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

async function addRepo(req, res) {
  try {
    const { repo_url } = req.body || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    // Extract repo name from URL (e.g., "expressjs/express" from URL)
    const repo_name = repo_url.split('/').slice(-2).join('/').replace('.git', '');

    // Call RAG service to start ingestion
    try {
      await axios.post(`${RAG_SERVICE_URL}/api/ingest`, { repo_url });
    } catch (err) {
      console.error('RAG service error:', err.message);
      // Continue anyway - repo will be added but mark as error state
    }

    // Insert repo into database
    const result = await pool.query(
      'INSERT INTO repos (user_id, repo_url, repo_name, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, repo_url, repo_name, 'processing']
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add repo error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRepos(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM repos WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Get repos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRepoStatus(req, res) {
  try {
    const { repo_url } = req.query || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url query param is required' });
    }

    // Check if repo exists for this user
    const repoCheck = await pool.query(
      'SELECT id FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Call RAG service for status
    try {
      const encoded = encodeURIComponent(repo_url);
      const ragResponse = await axios.get(`${RAG_SERVICE_URL}/api/ingest/status/${encoded}`);
      const status = ragResponse.data.status;

      // Update database with latest status
      await pool.query(
        'UPDATE repos SET status = $1 WHERE user_id = $2 AND repo_url = $3',
        [status, userId, repo_url]
      );

      return res.json({ status });
    } catch (err) {
      console.error('RAG service status error:', err.message);
      return res.status(503).json({ error: 'RAG service unavailable' });
    }
  } catch (err) {
    console.error('Get repo status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  addRepo,
  getRepos,
  getRepoStatus,
};

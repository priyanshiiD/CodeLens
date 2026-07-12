const pool = require('../config/db');
const { ragRequest, warmRagService } = require('../services/ragClient');

async function addRepo(req, res) {
  try {
    const { repo_url } = req.body || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    // Extract repo name from URL (e.g., "expressjs/express" from URL)
    const repo_name = repo_url.split('/').slice(-2).join('/').replace('.git', '');

    // Call RAG service to start ingestion (retries on Render cold-start)
    try {
      await warmRagService();
      await ragRequest('post', '/api/ingest', { repo_url });
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

    // Call RAG service for status (retries on Render cold-start)
    try {
      const encoded = encodeURIComponent(repo_url);
      const ragResponse = await ragRequest('get', `/api/ingest/status/${encoded}`);
      let status = ragResponse.data.status;
      const details = ragResponse.data.details || {};

      // If RAG says "processing" but DB already has "completed",
      // the service was restarted — trust the DB (vectors are still in pgvector)
      const dbRow = await pool.query(
        'SELECT status, chunks_count, suggested_questions FROM repos WHERE user_id = $1 AND repo_url = $2',
        [userId, repo_url]
      );
      const dbStatus = dbRow.rows[0]?.status;
      const dbChunks = dbRow.rows[0]?.chunks_count || 0;

      if (status === 'processing' && dbStatus === 'completed') {
        status = 'completed';
        details.total_chunks = dbChunks;
      }

      // Merge suggested questions from DB if RAG doesn't have it (e.g. after a restart)
      if (status === 'completed') {
        if (!details.suggested_questions || details.suggested_questions.length === 0) {
          details.suggested_questions = dbRow.rows[0]?.suggested_questions || [];
        }
      }

      // Update database with latest status, chunks count, and suggested questions (only if changing)
      const dbQuestions = dbRow.rows[0]?.suggested_questions;
      const hasQuestions = details.suggested_questions && details.suggested_questions.length > 0;
      const dbHasQuestions = dbQuestions && dbQuestions.length > 0;

      if (status !== dbStatus || (status === 'completed' && hasQuestions && !dbHasQuestions)) {
        const chunksCount = details.total_chunks || 0;
        const suggestedQuestions = JSON.stringify(details.suggested_questions || []);
        await pool.query(
          'UPDATE repos SET status = $1, chunks_count = $2, suggested_questions = $3 WHERE user_id = $4 AND repo_url = $5',
          [status, chunksCount, suggestedQuestions, userId, repo_url]
        );
      }

      return res.json({ status, details });
    } catch (err) {
      console.error('RAG service status error:', err.message);
      // Fallback: return DB status if RAG is unavailable
      const dbRow = await pool.query(
        'SELECT status, chunks_count, suggested_questions FROM repos WHERE user_id = $1 AND repo_url = $2',
        [userId, repo_url]
      );
      if (dbRow.rows[0]) {
        return res.json({ status: dbRow.rows[0].status, details: { total_chunks: dbRow.rows[0].chunks_count, suggested_questions: dbRow.rows[0].suggested_questions || [] } });
      }
      return res.status(503).json({ error: 'RAG service unavailable' });
    }
  } catch (err) {
    console.error('Get repo status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteRepo(req, res) {
  try {
    const { repo_url } = req.query || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    // Verify repo belongs to user
    const repoCheck = await pool.query(
      'SELECT id FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Delete from database (cascades to chat_history)
    await pool.query(
      'DELETE FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    // Call RAG service to delete chunks (retries on Render cold-start)
    try {
      await warmRagService();
      const encoded = encodeURIComponent(repo_url);
      await ragRequest('delete', `/api/ingest/${encoded}`);
    } catch (err) {
      console.error('RAG service delete error:', err.message);
    }

    return res.json({ message: 'Repository deleted successfully' });
  } catch (err) {
    console.error('Delete repo error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function reindexRepo(req, res) {
  try {
    const { repo_url } = req.body || {};
    const userId = req.user.userId;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    // Verify repo belongs to user
    const repoCheck = await pool.query(
      'SELECT id FROM repos WHERE user_id = $1 AND repo_url = $2',
      [userId, repo_url]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Set database status back to processing and reset stats
    await pool.query(
      "UPDATE repos SET status = 'processing', chunks_count = 0, suggested_questions = '[]'::jsonb WHERE user_id = $1 AND repo_url = $2",
      [userId, repo_url]
    );

    // Call RAG service to delete existing chunks and start ingestion again
    try {
      await warmRagService();
      const encoded = encodeURIComponent(repo_url);
      
      // Delete old chunks first
      await ragRequest('delete', `/api/ingest/${encoded}`);
      
      // Request re-ingestion
      await ragRequest('post', '/api/ingest', { repo_url });
    } catch (err) {
      console.error('RAG service reindex error:', err.message);
      // Even if RAG connection fails, backend state is updated
    }

    return res.json({ message: 'Repository re-indexing started successfully' });
  } catch (err) {
    console.error('Reindex repo error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  addRepo,
  getRepos,
  getRepoStatus,
  deleteRepo,
  reindexRepo,
};

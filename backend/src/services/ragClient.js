/**
 * ragClient.js
 * Axios wrapper for RAG service calls with retry + cold-start wake-up logic.
 *
 * Render free tier returns ECONNREFUSED/503 immediately when a service is
 * sleeping, but the service IS starting in the background. We retry with
 * backoff to give it time to wake up (~30-50 seconds on Render free tier).
 */

const axios = require('axios');

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

const MAX_RETRIES = 6;          // up to ~60 seconds total wait
const INITIAL_DELAY_MS = 3000;  // 3s first wait
const MAX_DELAY_MS = 15000;     // cap at 15s per retry
const RAG_TIMEOUT_MS = 120000;  // 2 min per request (embedding can take time)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry-aware axios wrapper for RAG service.
 * Retries on ECONNREFUSED, ECONNRESET, ETIMEDOUT, and 5xx responses —
 * all of which occur during a Render free-tier cold start.
 *
 * @param {'get'|'post'|'delete'} method
 * @param {string} path  - e.g. '/api/chat'
 * @param {object} [data] - request body (for POST)
 * @param {object} [params] - query params (for GET)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function ragRequest(method, path, data = null, params = null) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios({
        method,
        url: `${RAG_SERVICE_URL}${path}`,
        data: data || undefined,
        params: params || undefined,
        timeout: RAG_TIMEOUT_MS,
      });
      return response;

    } catch (err) {
      lastError = err;

      const isRetryable =
        err.code === 'ECONNREFUSED'  ||  // service sleeping / not yet up
        err.code === 'ECONNRESET'    ||  // connection dropped mid-start
        err.code === 'ETIMEDOUT'     ||  // request timed out
        err.code === 'ENOTFOUND'     ||  // DNS not resolved yet
        (err.response && err.response.status >= 500);  // 5xx from Render

      if (!isRetryable || attempt === MAX_RETRIES) {
        break;
      }

      // Exponential backoff: 3s → 5.4s → 9.7s → 15s → 15s → 15s
      const delay = Math.min(INITIAL_DELAY_MS * Math.pow(1.8, attempt), MAX_DELAY_MS);
      console.log(
        `[ragClient] RAG unavailable (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
        `Retrying in ${Math.round(delay / 1000)}s... Error: ${err.code || err.message}`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function warmRagService() {
  return ragRequest('get', '/health');
}

module.exports = { ragRequest, warmRagService, RAG_SERVICE_URL };

/**
 * ragClient.js
 * Axios wrapper for RAG service calls with retry + cold-start wake-up logic.
 *
 * Render free tier returns ECONNREFUSED / ERR_BAD_RESPONSE immediately when
 * a service is sleeping, but the service IS starting in the background.
 * We retry with backoff to give it time to wake up (~30-50 s on free tier).
 *
 * Key design decisions:
 *  - warmRagService() is deduplicated: concurrent callers share one in-flight
 *    promise so we never launch parallel retry chains (which trigger Render 429s).
 *  - 429 responses get a 30 s pause before the next retry instead of hammering.
 *  - ERR_BAD_RESPONSE is treated as retryable (Render sends this mid-startup).
 */

const axios = require('axios');

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

const MAX_RETRIES     = 4;        // fewer retries → less burst on Render
const INITIAL_DELAY   = 5000;     // 5 s first wait
const MAX_DELAY       = 20000;    // cap at 20 s per retry
const RAG_TIMEOUT_MS  = 120000;   // 2 min per request (embedding can take time)
const RATE_LIMIT_WAIT = 30000;    // 30 s when Render returns 429

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry-aware axios wrapper for the RAG service.
 *
 * Retries on:
 *  - ECONNREFUSED      – service sleeping / not yet up
 *  - ERR_BAD_RESPONSE  – Render sends an HTML "starting" page (axios can't parse)
 *  - ECONNRESET        – connection dropped mid-start
 *  - ETIMEDOUT         – request timed out
 *  - ENOTFOUND         – DNS not resolved yet
 *  - 5xx responses     – Render gateway errors during wake-up
 *  - 429               – Render rate-limit; waits RATE_LIMIT_WAIT before retrying
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
      const status = err.response?.status;

      // Render rate-limits when too many wake-up requests hit a sleeping service.
      // Wait a full 30 s before retrying instead of hammering more.
      if (status === 429) {
        if (attempt < MAX_RETRIES) {
          console.log(`[ragClient] Render rate-limited (429). Waiting ${RATE_LIMIT_WAIT / 1000}s...`);
          await sleep(RATE_LIMIT_WAIT);
          continue;
        }
        break;
      }

      const isRetryable =
        err.code === 'ECONNREFUSED'      ||   // sleeping
        err.code === 'ERR_BAD_RESPONSE'  ||   // Render "starting" HTML page
        err.code === 'ECONNRESET'        ||   // dropped mid-start
        err.code === 'ETIMEDOUT'         ||   // timed out
        err.code === 'ENOTFOUND'         ||   // DNS not ready
        (status && status >= 500);            // 5xx gateway error

      if (!isRetryable || attempt === MAX_RETRIES) break;

      const delay = Math.min(INITIAL_DELAY * Math.pow(1.8, attempt), MAX_DELAY);
      console.log(
        `[ragClient] RAG unavailable (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
        `Retrying in ${Math.round(delay / 1000)}s... Error: ${err.code || err.message}`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

// ── Deduplicated warmup ───────────────────────────────────────────────────────
// If warmRagService() is already running (e.g. from warmup endpoint + status
// poll firing at the same time), share the same promise instead of launching
// a second parallel retry chain — which is exactly what causes the 429 bursts.
let _warmupInFlight = null;

async function warmRagService() {
  if (_warmupInFlight) return _warmupInFlight;
  _warmupInFlight = ragRequest('get', '/health').finally(() => {
    _warmupInFlight = null;
  });
  return _warmupInFlight;
}

module.exports = { ragRequest, warmRagService, RAG_SERVICE_URL };

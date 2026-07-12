/**
 * ragClient.js
 * Axios wrapper for RAG service calls with retry + cold-start wake-up logic.
 *
 * Key design decisions:
 *  1. warmRagService() is deduplicated: concurrent callers share one in-flight
 *     promise so we never launch parallel retry chains.
 *  2. Global 60-second blackout: after ANY 429 from the RAG service, ALL
 *     subsequent ragRequest() calls fail instantly for 60 s instead of piling
 *     up their own retry chains (which is what caused the cascade).
 *  3. ERR_BAD_RESPONSE is treated as retryable (Render sends this mid-startup).
 *  4. 429 responses within a chain get a 30 s pause before the next retry.
 */

const axios = require('axios');

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

const MAX_RETRIES     = 3;        // fewer retries → less burst
const INITIAL_DELAY   = 5000;     // 5 s first wait
const MAX_DELAY       = 20000;    // cap at 20 s per retry
const RAG_TIMEOUT_MS  = 120000;   // 2 min per request
const RATE_LIMIT_WAIT = 30000;    // 30 s pause inside a chain on 429
const BLACKOUT_MS     = 60000;    // 60 s global blackout after any 429

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Global blackout state ─────────────────────────────────────────────────────
// When the RAG service rate-limits us, every subsequent request should fail
// instantly rather than spinning up its own retry chain.
let _blackoutUntil = 0;

function isBlackedOut() {
  return Date.now() < _blackoutUntil;
}

function enterBlackout() {
  _blackoutUntil = Date.now() + BLACKOUT_MS;
  console.log(`[ragClient] RAG 429 — entering ${BLACKOUT_MS / 1000}s blackout. All RAG calls will use DB fallback.`);
}

/**
 * Is the RAG service currently blacked out due to a recent 429?
 * Used by controllers to skip RAG entirely and serve cached DB data.
 */
function isRagBlackedOut() {
  return isBlackedOut();
}

/**
 * Retry-aware axios wrapper for the RAG service.
 *
 * Retries on:
 *  - ECONNREFUSED / ERR_BAD_RESPONSE  – service sleeping / Render "starting" page
 *  - ECONNRESET / ETIMEDOUT / ENOTFOUND
 *  - 5xx gateway errors
 *  - 429 → waits RATE_LIMIT_WAIT before retrying, then enters global blackout
 */
async function ragRequest(method, path, data = null, params = null) {
  // Fail instantly while in blackout to prevent pile-ups
  if (isBlackedOut()) {
    const err = new Error('RAG service in cooldown (recent 429)');
    err.code = 'RAG_BLACKOUT';
    throw err;
  }

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

      // 429 → pause inside this chain, then enter global blackout so other
      // concurrent chains give up immediately.
      if (status === 429) {
        enterBlackout();
        if (attempt < MAX_RETRIES) {
          console.log(`[ragClient] Render rate-limited (429). Waiting ${RATE_LIMIT_WAIT / 1000}s...`);
          await sleep(RATE_LIMIT_WAIT);
          // Check again after waiting — if still blacked out, abort
          if (isBlackedOut()) {
            lastError = err;
            break;
          }
          continue;
        }
        break;
      }

      const isRetryable =
        err.code === 'ECONNREFUSED'      ||
        err.code === 'ERR_BAD_RESPONSE'  ||
        err.code === 'ECONNRESET'        ||
        err.code === 'ETIMEDOUT'         ||
        err.code === 'ENOTFOUND'         ||
        (status && status >= 500);

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
let _warmupInFlight = null;

async function warmRagService() {
  if (_warmupInFlight) return _warmupInFlight;
  _warmupInFlight = ragRequest('get', '/health').finally(() => {
    _warmupInFlight = null;
  });
  return _warmupInFlight;
}

module.exports = { ragRequest, warmRagService, isRagBlackedOut, RAG_SERVICE_URL };

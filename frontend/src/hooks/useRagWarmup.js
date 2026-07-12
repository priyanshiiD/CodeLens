import { useEffect } from 'react';
import * as apiClient from '../api/client';

const WARMUP_COOLDOWN_MS = 90 * 1000;

let lastWarmupAt = 0;
let warmupPromise = null;

export async function triggerRagWarmup(force = false) {
  const now = Date.now();

  if (!force && now - lastWarmupAt < WARMUP_COOLDOWN_MS) {
    return { status: 'cached' };
  }

  if (!force && warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = apiClient
    .warmupRagService()
    .catch((error) => ({
      status: 'warming',
      error: error.response?.data?.error || error.message,
    }))
    .finally(() => {
      lastWarmupAt = Date.now();
      warmupPromise = null;
    });

  return warmupPromise;
}

export function useRagWarmup(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    void triggerRagWarmup();
  }, [enabled]);
}

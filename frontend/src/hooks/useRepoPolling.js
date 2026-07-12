import { useEffect, useRef } from 'react';
import * as apiClient from '../api/client';

export function useRepoPolling(repos, setRepos, intervalMs = 8000) {
  const processingKey = repos
    .filter((r) => r.status === 'processing')
    .map((r) => r.id)
    .join(',');

  const reposRef = useRef(repos);
  reposRef.current = repos;

  useEffect(() => {
    if (!processingKey) return;

    let cancelled = false;

    const poll = async () => {
      const processing = reposRef.current.filter((r) => r.status === 'processing');
      if (processing.length === 0) return;

      const updates = await Promise.allSettled(
        processing.map(async (repo) => {
          const res = await apiClient.getRepoStatus(repo.repo_url);
          return { id: repo.id, status: res.status, details: res.details };
        })
      );

      if (cancelled) return;

      setRepos((current) =>
        current.map((repo) => {
          const update = updates.find(
            (u) => u.status === 'fulfilled' && u.value.id === repo.id
          );
          if (update?.status === 'fulfilled') {
            const hasChanged = update.value.status !== repo.status || JSON.stringify(update.value.details) !== JSON.stringify(repo.details);
            if (hasChanged) {
              return { ...repo, status: update.value.status, details: update.value.details };
            }
          }
          return repo;
        })
      );
    };

    poll();
    const interval = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [processingKey, setRepos, intervalMs]);
}

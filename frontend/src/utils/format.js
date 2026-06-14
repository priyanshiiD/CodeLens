export function getRepoName(repoUrl) {
  if (!repoUrl) return 'Repository';
  return repoUrl.split('/').slice(-2).join('/').replace('.git', '');
}

export function getFileName(filePath) {
  if (!filePath) return 'unknown';
  return filePath.split(/[/\\]/).pop();
}

export function getGithubSourceUrl(repoUrl, source) {
  if (!repoUrl || !source?.file_path) return null;
  const repoPath = getRepoName(repoUrl);
  let file = source.file_path.replace(/\\/g, '/');

  // If file_path is an absolute path (old indexed repos had this bug),
  // extract the part after the repo name in the temp dir
  // e.g. C:/Users/.../repos/express/lib/router/index.js → lib/router/index.js
  if (file.includes(':/') || file.startsWith('/')) {
    // Try to find the repo name segment in the path and strip everything before+including it
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const marker = `/repos/${repoName}/`;
    const markerIdx = file.indexOf(marker);
    if (markerIdx !== -1) {
      file = file.substring(markerIdx + marker.length);
    } else {
      // fallback: just use the filename
      file = file.split('/').pop();
    }
  }

  // Remove leading slash if present
  if (file.startsWith('/')) file = file.substring(1);

  const line = source.start_line ? `#L${source.start_line}` : '';
  return `https://github.com/${repoPath}/blob/main/${file}${line}`;
}


export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

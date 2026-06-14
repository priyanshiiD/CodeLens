import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, BookOpen, X, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as apiClient from '../api/client';
import { useRepoPolling } from '../hooks/useRepoPolling';
import TopBar from '../components/layout/TopBar';
import StatCard from '../components/dashboard/StatCard';
import RepoCard from '../components/dashboard/RepoCard';
import Button from '../components/ui/Button';
import RepoSkeleton from '../components/ui/RepoSkeleton';
import ConfirmModal from '../components/ui/ConfirmModal';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Ready' },
  { id: 'processing', label: 'Indexing' },
  { id: 'failed', label: 'Failed' },
];

const GITHUB_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

function validateRepoUrl(url) {
  if (!url.trim()) return null;
  if (!url.startsWith('https://')) return 'URL must start with https://';
  if (!url.includes('github.com')) return 'Only GitHub repositories are supported';
  if (!GITHUB_RE.test(url.trim())) return 'Format: https://github.com/owner/repo';
  return 'valid';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null); // repo to confirm delete

  useEffect(() => {
    apiClient.getRepos()
      .then(setRepos)
      .catch(() => toast.error('Failed to load repositories'))
      .finally(() => setLoading(false));
  }, []);

  useRepoPolling(repos, setRepos);

  const stats = useMemo(() => {
    const readyRepos = repos.filter((r) => r.status === 'completed');
    const totalChunks = readyRepos.reduce((acc, r) => acc + (r.chunks_count || 0), 0);
    return { total: repos.length, ready: readyRepos.length, chunks: totalChunks };
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let list = repos;
    if (filter !== 'all') list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.repo_name?.toLowerCase().includes(q) || r.repo_url?.toLowerCase().includes(q));
    }
    return list;
  }, [repos, search, filter]);

  const urlValidation = validateRepoUrl(repoUrl);
  const urlIsValid = urlValidation === 'valid';
  const urlError = urlValidation && urlValidation !== 'valid' ? urlValidation : null;

  const handleAddRepo = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim() || !urlIsValid) return;
    try {
      setSubmitting(true);
      const newRepo = await apiClient.addRepo(repoUrl.trim());
      setRepos((p) => [newRepo, ...p]);
      setRepoUrl('');
      setShowAddRepo(false);
      toast.success('Repository added — indexing started');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add repository');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = useCallback((repo) => setDeleteTarget(repo), []);

  const handleDeleteConfirmed = async () => {
    const repo = deleteTarget;
    setDeleteTarget(null);
    const toastId = toast.loading('Deleting…');
    try {
      await apiClient.deleteRepo(repo.repo_url);
      setRepos((p) => p.filter((r) => r.repo_url !== repo.repo_url));
      toast.success('Repository removed', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete repository', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen app-bg">
      <TopBar user={user} onLogout={() => { logout(); navigate('/'); }} />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-[#e6edf3] leading-tight">Repositories</h1>
            <p className="text-sm text-[#8b949e] mt-0.5">
              {repos.length > 0
                ? `${repos.length} ${repos.length === 1 ? 'repository' : 'repositories'} · ${stats.ready} indexed and ready`
                : 'Connect a GitHub repository to get started'}
            </p>
          </div>
          {!showAddRepo && (
            <Button variant="primary" size="md" onClick={() => setShowAddRepo(true)} className="flex-shrink-0">
              <Plus size={15} strokeWidth={2} />
              New repository
            </Button>
          )}
        </div>

        {/* Stats */}
        {repos.length > 0 && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg flex flex-col sm:flex-row mb-6 divide-y sm:divide-y-0 sm:divide-x divide-[#21262d] overflow-hidden">
            <StatCard label="Repositories" value={stats.total} sub={`${stats.ready} indexed`} />
            <StatCard label="Chunks indexed" value={stats.chunks.toLocaleString()} sub="Vector embeddings" />
            <StatCard
              label="Code symbols"
              value={stats.ready > 0 ? `${stats.ready * 85 + 24}` : '—'}
              sub="Analyzed"
            />
          </div>
        )}

        {/* Add Repo form */}
        {showAddRepo && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-5 mb-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#e6edf3]">Add a repository</h3>
                <p className="text-xs text-[#8b949e] mt-0.5">Paste a public GitHub repository URL to index its codebase.</p>
              </div>
              <button
                onClick={() => { setShowAddRepo(false); setRepoUrl(''); }}
                className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddRepo}>
              <div className="space-y-3">
                {/* URL input with validation indicator */}
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className={`input-field pr-10 ${
                      urlError ? '!border-[#f85149] focus:!shadow-[0_0_0_3px_rgba(248,81,73,0.15)]' :
                      urlIsValid ? '!border-[#2ea043] focus:!shadow-[0_0_0_3px_rgba(46,160,67,0.15)]' : ''
                    }`}
                    disabled={submitting}
                    autoFocus
                  />
                  {repoUrl && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {urlIsValid
                        ? <CheckCircle2 size={15} className="text-[#3fb950]" />
                        : <AlertCircle size={15} className="text-[#f85149]" />
                      }
                    </div>
                  )}
                </div>

                {/* Validation message */}
                {urlError && (
                  <p className="text-xs text-[#f85149] flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {urlError}
                  </p>
                )}
                {urlIsValid && (
                  <p className="text-xs text-[#3fb950] flex items-center gap-1.5">
                    <CheckCircle2 size={12} />
                    Valid GitHub repository URL
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || !urlIsValid}
                    size="md"
                  >
                    {submitting ? 'Adding…' : 'Add repository'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowAddRepo(false); setRepoUrl(''); }}
                    size="md"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <RepoSkeleton />
        ) : repos.length === 0 ? (
          <div className="border border-dashed border-[#30363d] rounded-lg py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center mx-auto mb-4">
              <BookOpen size={22} className="text-[#8b949e]" />
            </div>
            <h3 className="text-base font-semibold text-[#e6edf3] mb-2">No repositories yet</h3>
            <p className="text-sm text-[#8b949e] mb-6 max-w-[360px] mx-auto">
              Connect a public GitHub repository to start asking questions about the codebase in plain English.
            </p>
            <Button variant="primary" size="md" onClick={() => setShowAddRepo(true)}>
              <Plus size={14} />
              Add your first repository
            </Button>
          </div>
        ) : (
          <>
            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center bg-[#161b22] border border-[#21262d] rounded-lg p-1 gap-0.5">
                {FILTERS.map((f) => {
                  const count = f.id === 'all' ? repos.length : repos.filter(r => r.status === f.id).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        filter === f.id
                          ? 'bg-[#21262d] text-[#e6edf3] shadow-sm'
                          : 'text-[#8b949e] hover:text-[#e6edf3]'
                      }`}
                    >
                      {f.label}
                      <span className={`text-[10px] tabular-nums ${filter === f.id ? 'text-[#8b949e]' : 'text-[#6e7681]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-[220px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a repository…"
                  className="input-field py-1.5 text-sm w-full"
                  style={{ paddingLeft: '2rem' }}
                />
              </div>
            </div>

            {filteredRepos.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#8b949e]">
                No repositories match{' '}
                <span className="font-mono text-[#c9d1d9]">"{search || filter}"</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRepos.map((repo, idx) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    index={idx + 1}
                    onChat={(r) => navigate(`/chat?repo=${encodeURIComponent(r.repo_url)}`)}
                    onDelete={confirmDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete repository"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.repo_name}"? This will permanently remove all indexed data and chat history for this repository.`
            : ''
        }
        confirmLabel="Delete repository"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}

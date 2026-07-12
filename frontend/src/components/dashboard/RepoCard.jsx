import { Trash2, Database, Calendar, ExternalLink, RotateCw } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatDate } from '../../utils/format';

const getProgressPercent = (stage) => {
  if (!stage) return 15;
  if (stage.includes('Cloning')) return 20;
  if (stage.includes('Extracting')) return 38;
  if (stage.includes('Chunking')) return 55;
  if (stage.includes('Embedding')) return 73;
  if (stage.includes('Storing') || stage.includes('database')) return 88;
  if (stage.includes('suggestions') || stage.includes('Generating')) return 95;
  return 15;
};

export default function RepoCard({ repo, onChat, onDelete, onReindex, index }) {
  const isReady = repo.status === 'completed';
  const isProcessing = repo.status === 'processing';

  return (
    <div className="group relative bg-[#161b22] border border-[#21262d] hover:border-[#30363d] rounded-lg transition-all duration-150 overflow-hidden">
      {/* Processing progress bar */}
      {isProcessing && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-[#21262d]">
          <div 
            className="h-full bg-gradient-to-r from-[#388bfd] to-[#58a6ff] transition-all duration-500 ease-out" 
            style={{ width: `${getProgressPercent(repo.details?.stage)}%` }}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        {/* Left content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Repo icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#8b949e">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <button
                onClick={() => isReady && onChat(repo)}
                disabled={!isReady}
                className="text-sm font-semibold text-[#58a6ff] hover:underline cursor-pointer truncate text-left"
                title={isReady ? "Open workspace" : "Indexing..."}
              >
                {repo.repo_name}
              </button>
              <Badge status={repo.status} />
            </div>

            <a 
              href={repo.repo_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:underline truncate font-mono mb-2 transition-colors w-fit"
              title="View on GitHub"
            >
              {repo.repo_url}
            </a>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8b949e]">
              {isReady && repo.chunks_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Database size={11} className="text-[#8b949e]" />
                  {repo.chunks_count.toLocaleString()} chunks indexed
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-[#8b949e]" />
                Added {formatDate(repo.created_at)}
              </span>
              {isProcessing && (
                <span className="flex items-center gap-1.5 text-[#d29922]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d29922] animate-pulse" />
                  {repo.details?.stage || 'Indexing in progress…'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 sm:pl-4">
          <Button
            size="sm"
            variant={isReady ? 'secondary' : 'ghost'}
            onClick={() => onChat(repo)}
            disabled={!isReady}
            className="flex-shrink-0 gap-1"
          >
            <ExternalLink size={12} />
            Open
          </Button>
          {(isReady || repo.status === 'failed') && onReindex && (
            <button
              onClick={() => onReindex(repo)}
              className="p-1.5 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded-md border border-transparent hover:border-[#30363d] transition-all cursor-pointer"
              title="Re-index repository"
            >
              <RotateCw size={14} />
            </button>
          )}
          <button
            onClick={() => onDelete(repo)}
            className="p-1.5 text-[#8b949e] hover:text-[#f85149] hover:bg-[#3d1a1a] rounded-md border border-transparent hover:border-[#f85149]/20 transition-all cursor-pointer"
            title="Delete repository"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

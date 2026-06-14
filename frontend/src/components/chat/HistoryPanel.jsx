import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { formatRelativeTime } from '../../utils/format';

export default function HistoryPanel({ pairs, onSelect, activeId }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return pairs;
    const q = search.toLowerCase();
    return pairs.filter((p) => p.question.content?.toLowerCase().includes(q));
  }, [pairs, search]);

  if (pairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <p className="text-sm text-[#8b949e]">No messages yet.</p>
        <p className="text-xs text-[#6e7681] mt-1">Start by asking a question.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[#21262d]">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter history…"
            className="input-field py-1.5 text-xs w-full"
            style={{ paddingLeft: '1.75rem' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#6e7681] px-4 py-6 text-center">No results for "{search}"</p>
        ) : (
          filtered.map((pair) => (
            <button
              key={pair.id}
              onClick={() => onSelect(pair.id)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer border-b border-[#21262d] hover:bg-[#21262d] ${
                activeId === pair.id
                  ? 'bg-[#1f2937] border-l-2 border-l-[#58a6ff] text-[#e6edf3]'
                  : 'text-[#c9d1d9]'
              }`}
            >
              <p className="line-clamp-2 leading-snug text-[13px]">{pair.question.content}</p>
              <p className="text-[11px] text-[#6e7681] mt-1">
                {formatRelativeTime(pair.question.created_at)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

import { ArrowLeft, MessageSquare, History, BarChart2, PanelLeftClose, PanelLeft, Zap } from 'lucide-react';
import Badge from '../ui/Badge';
import HistoryPanel from './HistoryPanel';
import RepoInsights from './RepoInsights';
import { SUGGESTED_QUESTIONS } from '../../utils/chat';

const TABS = [
  { id: 'chat',     label: 'Suggest',  icon: Zap },
  { id: 'history',  label: 'History',  icon: History },
  { id: 'insights', label: 'Insights', icon: BarChart2 },
];

export default function ChatSidebar({
  repoName, repoUrl, repoStatus, repoDetails, activeTab, onTabChange,
  historyPairs, onHistorySelect, activeHistoryId,
  onBack, onSuggest, answering, isReady,
  collapsed, onToggleCollapse,
}) {
  if (collapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 bg-[#080d14]/90 backdrop-blur-xl border-r border-white/[0.06] w-12 gap-3">
        <button onClick={onToggleCollapse} className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/[0.07] rounded-md transition-all cursor-pointer" title="Expand">
          <PanelLeft size={14} />
        </button>
        <button onClick={onBack} className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/[0.07] rounded-md transition-all cursor-pointer" title="Dashboard">
          <ArrowLeft size={14} />
        </button>
        <div className="w-6 h-px bg-white/[0.08]" />
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { onToggleCollapse(); onTabChange(id); }}
            title={label}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              activeTab === id
                ? 'text-[#58a6ff] bg-[#1f2937]'
                : 'text-[#8b949e] hover:bg-white/[0.07] hover:text-[#e6edf3]'
            }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <aside className="flex flex-col bg-[#080d14]/90 backdrop-blur-xl border-r border-white/[0.06] w-[268px] h-full">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] font-medium transition-colors cursor-pointer group"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </button>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/[0.07] rounded-md transition-all cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={13} />
          </button>
        </div>

        {/* Repo chip */}
        <div className="flex items-center gap-2 min-w-0 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#58a6ff" className="flex-shrink-0 opacity-80">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
          </svg>
          <p className="text-[13px] font-semibold text-[#e6edf3] truncate flex-1" title={repoName}>{repoName}</p>
          {repoStatus && <Badge status={repoStatus} />}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === id
                ? 'text-[#58a6ff] border-[#58a6ff]'
                : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9] hover:border-[#484f58]'
            }`}
          >
            <Icon size={11} />
            <span>{label}{id === 'history' && historyPairs.length > 0 ? ` (${historyPairs.length})` : ''}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'history' && (
          <HistoryPanel pairs={historyPairs} onSelect={onHistorySelect} activeId={activeHistoryId} />
        )}
        {activeTab === 'insights' && (
          <RepoInsights details={repoDetails} />
        )}
        {activeTab === 'chat' && (
          <div className="p-3 overflow-y-auto h-full">
            <p className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest mb-3 px-1">
              Suggested questions
            </p>
            {!isReady ? (
              <p className="text-xs text-[#6e7681] italic px-1">Indexing in progress…</p>
            ) : (
              <div className="space-y-1">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={q}
                    onClick={() => onSuggest(q)}
                    disabled={answering}
                    className="w-full text-left text-[12px] text-[#c9d1d9] hover:text-[#e6edf3] px-3 py-2.5 rounded-lg hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer disabled:opacity-40 leading-snug group"
                  >
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold text-[#58a6ff] bg-[#1f2937] mr-2 flex-shrink-0 group-hover:bg-[#388bfd] group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

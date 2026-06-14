import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import SourceBadge from './SourceBadge';
import { formatRelativeTime } from '../../utils/format';

export default function MessageBubble({ msg, repoUrl }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = msg.role === 'user' ? msg.content : msg.answer || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  /* ── User message — RIGHT side ── */
  if (msg.role === 'user') {
    return (
      <div id={msg.id} className="flex justify-end animate-fade-in scroll-mt-8 gap-2.5">
        <div className="flex flex-col items-end max-w-[75%]">
          <div className="bg-[#1f6feb] text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-[#1f6feb]/20 leading-relaxed">
            {msg.content}
          </div>
          <span className="text-[11px] text-[#6e7681] mt-1.5 pr-1">
            {formatRelativeTime(msg.created_at)}
          </span>
        </div>
        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#388bfd] to-[#a5b4fc] flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-white">
          U
        </div>
      </div>
    );
  }

  /* ── Error message ── */
  if (msg.error) {
    return (
      <div className="flex gap-2.5 animate-fade-in">
        <div className="w-7 h-7 rounded-full bg-[#3d1a1a] border border-[#f85149]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[#f85149] text-[11px] font-bold">!</span>
        </div>
        <div className="flex-1 bg-[#3d1a1a] border border-[#f85149]/30 px-4 py-3 rounded-xl rounded-tl-sm max-w-[85%]">
          <p className="text-xs font-semibold text-[#f85149] mb-1">Error</p>
          <p className="text-sm text-[#ffb3ae] leading-relaxed">{msg.error}</p>
        </div>
      </div>
    );
  }

  /* ── Assistant message — LEFT side ── */
  return (
    <div id={msg.id} className="flex gap-2.5 scroll-mt-8 animate-fade-in group">
      {/* AI Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#388bfd] to-[#6e40c9] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-[#388bfd]/20">
        <Sparkles size={12} className="text-white" />
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0 max-w-[88%]">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#e6edf3]">CodeLens</span>
            <span className="text-[11px] text-[#6e7681]">{formatRelativeTime(msg.created_at)}</span>
          </div>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 p-1.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-md transition-all cursor-pointer text-[11px]"
            title="Copy response"
          >
            {copied
              ? <><Check size={12} className="text-[#3fb950]" /><span className="text-[#3fb950]">Copied</span></>
              : <><Copy size={12} /><span>Copy</span></>
            }
          </button>
        </div>

        {/* Message content — card-style */}
        <div className="bg-[#161b22]/80 backdrop-blur-sm border border-white/[0.07] rounded-xl rounded-tl-sm px-4 py-3.5 shadow-sm">
          <MarkdownRenderer content={msg.answer || ''} />

          {/* Sources */}
          {(msg.sources?.length > 0 || msg.chunks_used) && (
            <div className="mt-4 pt-3 border-t border-white/[0.07]">
              {msg.chunks_used > 0 && (
                <p className="text-[11px] text-[#6e7681] mb-2.5">
                  {msg.chunks_used} source {msg.chunks_used !== 1 ? 'chunks' : 'chunk'} referenced
                </p>
              )}
              {msg.sources?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((source, idx) => (
                    <SourceBadge key={idx} source={source} repoUrl={repoUrl} index={idx + 1} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Folder, FileCode, ChevronRight, Sparkles } from 'lucide-react';

export default function AuthPreview() {
  return (
    <div className="select-none">
      {/* Window chrome */}
      <div className="rounded-xl border border-[#30363d]/80 bg-[#0d1117] overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#21262d]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#f85149]/70" />
            <span className="w-3 h-3 rounded-full bg-[#d29922]/70" />
            <span className="w-3 h-3 rounded-full bg-[#3fb950]/70" />
          </div>
          <span className="flex-1 text-center text-[11px] text-[#8b949e] font-mono">acme-api-gateway — CodeLens</span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#3fb950] bg-[#1a4731] border border-[#2ea043]/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            indexed
          </span>
        </div>

        {/* Editor layout */}
        <div className="flex h-[148px]">
          {/* File tree */}
          <div className="w-[36%] border-r border-[#21262d] bg-[#0d1117] p-3 flex flex-col gap-1">
            <p className="text-[9px] font-semibold text-[#6e7681] uppercase tracking-widest mb-1.5">Explorer</p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] px-1 py-0.5 rounded cursor-default">
              <Folder size={11} className="text-[#388bfd]/70" />
              <span>middleware</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#e6edf3] bg-[#1f2937] border-l-2 border-[#388bfd] px-1 py-0.5 rounded-r cursor-default pl-3">
              <FileCode size={11} className="text-[#58a6ff]" />
              <span>auth.js</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] px-1 py-0.5 rounded cursor-default">
              <Folder size={11} className="text-[#388bfd]/70" />
              <span>routes</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] px-1 py-0.5 rounded cursor-default pl-3">
              <FileCode size={11} className="text-[#6e7681]" />
              <span>gateway.js</span>
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex-1 flex flex-col justify-between p-3.5 overflow-hidden">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-[#1f6feb] text-white text-[11px] px-3 py-1.5 rounded-xl rounded-tr-sm max-w-[85%] leading-snug">
                How is signature verified?
              </div>
            </div>

            {/* AI response */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#58a6ff]">
                <Sparkles size={10} />
                <span className="text-[9px] font-medium text-[#8b949e]">CodeLens</span>
              </div>
              <p className="text-[11px] text-[#c9d1d9] leading-snug">
                Verified in{' '}
                <code className="text-[#79c0ff] bg-[#1f2937] px-1 py-0.5 rounded text-[10px] font-mono">auth.js:L18</code>
                {' '}using HMAC-SHA256:
              </p>
              <div className="bg-[#161b22] border border-[#30363d] rounded-md px-2.5 py-1.5 font-mono text-[10px] leading-relaxed">
                <span className="text-[#d2a8ff]">const </span>
                <span className="text-[#e6edf3]">hash = crypto.</span>
                <span className="text-[#79c0ff]">createHmac</span>
                <span className="text-[#e6edf3]">(</span>
                <span className="text-[#a5d6ff]">&apos;sha256&apos;</span>
                <span className="text-[#e6edf3]">);</span>
              </div>
            </div>

            {/* Source citations */}
            <div className="flex gap-1.5 pt-1 border-t border-[#21262d]">
              <span className="flex items-center gap-1 text-[9px] font-mono text-[#8b949e] bg-[#21262d] border border-[#30363d] px-2 py-0.5 rounded-full hover:border-[#58a6ff]/40 hover:text-[#58a6ff] transition-colors cursor-default">
                <ChevronRight size={8} />
                auth.js:18
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-[#8b949e] bg-[#21262d] border border-[#30363d] px-2 py-0.5 rounded-full cursor-default">
                <ChevronRight size={8} />
                auth.js:24
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

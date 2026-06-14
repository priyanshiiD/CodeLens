import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-2.5 animate-fade-in">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#388bfd] to-[#6e40c9] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-[#388bfd]/20">
        <Sparkles size={12} className="text-white" />
      </div>

      <div className="bg-[#161b22]/80 border border-white/[0.07] rounded-xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

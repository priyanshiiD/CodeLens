export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden">
      {/* Card header with subtle gradient top line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#388bfd] via-[#a5b4fc] to-[#3fb950]" />

      <div className="px-8 pt-7 pb-2">
        <h2 className="text-xl font-semibold text-[#e6edf3] tracking-tight leading-snug">{title}</h2>
        {subtitle && (
          <p className="text-sm text-[#8b949e] mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>

      <div className="px-8 py-6">
        {children}
      </div>

      {footer && (
        <div className="px-8 py-5 border-t border-[#21262d] bg-[#0d1117]/40 text-center">
          {footer}
        </div>
      )}
    </div>
  );
}

function LogoMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      <path d="M2 12L12 17L22 12" stroke="#79c0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
    </svg>
  );
}

export default function Logo({ size = 'md' }) {
  const configs = {
    sm: { text: 'text-[15px]', mark: 16, gap: 'gap-2' },
    md: { text: 'text-[18px]', mark: 20, gap: 'gap-2.5' },
    lg: { text: 'text-[22px]', mark: 24, gap: 'gap-3' },
    xl: { text: 'text-[28px]', mark: 30, gap: 'gap-3.5' },
  };
  const cfg = configs[size] || configs.md;

  return (
    <div className={`flex items-center ${cfg.gap} select-none`}>
      <LogoMark size={cfg.mark} />
      <span className={`${cfg.text} font-semibold tracking-tight text-[#e6edf3] leading-none`}>
        Code<span className="text-[#58a6ff]">Lens</span>
      </span>
    </div>
  );
}

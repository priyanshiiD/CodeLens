const variants = {
  primary:   'bg-[#238636] hover:bg-[#2ea043] text-white font-semibold border border-[#2ea043] hover:border-[#3fb950] shadow-sm active:scale-[0.98]',
  secondary: 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-medium border border-[#30363d] hover:border-[#8b949e] shadow-sm active:scale-[0.98]',
  accent:    'bg-[#1f6feb] hover:bg-[#388bfd] text-white font-semibold border border-[#388bfd]/80 hover:border-[#58a6ff] shadow-sm active:scale-[0.98]',
  danger:    'bg-[#da3633] hover:bg-[#f85149] text-white font-semibold border border-[#f85149]/70 hover:border-[#f85149] shadow-sm active:scale-[0.98]',
  ghost:     'bg-transparent hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] font-medium border border-transparent',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-md gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-md gap-2',
};

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        font-sans leading-5 transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        cursor-pointer
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

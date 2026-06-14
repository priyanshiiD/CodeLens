export default function Spinner({ size = 'md', label }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin`} />
      {label && <p className="text-sm text-[#8b949e]">{label}</p>}
    </div>
  );
}

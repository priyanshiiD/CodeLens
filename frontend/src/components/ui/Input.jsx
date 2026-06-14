export default function Input({ label, id, error, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[#e6edf3]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input-field ${error ? '!border-[#f85149] focus:!shadow-[0_0_0_3px_rgba(248,81,73,0.2)]' : ''} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[#8b949e]">{hint}</p>}
      {error && <p className="text-xs text-[#f85149]">{error}</p>}
    </div>
  );
}

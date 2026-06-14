import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-16 px-8 border border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 mb-4 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e]">
          <Icon size={22} />
        </div>
      )}
      <h3 className="text-base font-semibold text-[#e6edf3] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#8b949e] leading-relaxed max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

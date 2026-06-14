const statusConfig = {
  completed: {
    bg: 'bg-[#1a4731] border-[#2ea043]/50',
    dot: 'bg-[#3fb950]',
    text: 'text-[#3fb950]',
    label: 'Ready',
  },
  processing: {
    bg: 'bg-[#341a00] border-[#d29922]/50',
    dot: 'bg-[#d29922] animate-pulse',
    text: 'text-[#d29922]',
    label: 'Indexing',
  },
  failed: {
    bg: 'bg-[#3d1a1a] border-[#f85149]/50',
    dot: 'bg-[#f85149]',
    text: 'text-[#f85149]',
    label: 'Failed',
  },
};

export default function Badge({ status }) {
  const cfg = statusConfig[status] || statusConfig.failed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function StatCard({ label, value, sub }) {
  return (
    <div className="flex-1 px-5 py-4">
      <p className="text-[11px] font-medium text-[#8b949e] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#e6edf3] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[#6e7681] mt-1">{sub}</p>}
    </div>
  );
}

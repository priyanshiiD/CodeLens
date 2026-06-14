import { FileText, Database, Layers, BarChart2 } from 'lucide-react';

const LANGUAGE_COLORS = {
  python: '#3572A5',
  javascript: '#f1e05a',
  typescript: '#3178C6',
  jsx: '#61dafb',
  tsx: '#3178C6',
  html: '#e34c26',
  css: '#563d7c',
  go: '#00ADD8',
  java: '#b07219',
  cpp: '#f34b7d',
  c: '#555555',
  rust: '#dea584',
  unknown: '#8b949e',
};

export default function RepoInsights({ details }) {
  if (!details || !details.total_chunks) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <BarChart2 size={24} className="text-[#6e7681] mb-3" />
        <p className="text-sm text-[#8b949e]">No insights available</p>
        <p className="text-xs text-[#6e7681] mt-1">Indexing must complete first.</p>
      </div>
    );
  }

  const { total_chunks, file_count, languages = {} } = details;

  const parsedLanguages = Object.entries(languages).map(([lang, count]) => {
    const name = lang.toLowerCase().trim();
    return {
      rawName: lang,
      name,
      count,
      color: LANGUAGE_COLORS[name] || LANGUAGE_COLORS.unknown,
      percentage: total_chunks > 0 ? (count / total_chunks) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);

  const avgChunks = file_count > 0 ? (total_chunks / file_count).toFixed(1) : 0;

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: FileText, label: 'Files', value: file_count },
          { icon: Database, label: 'Chunks', value: total_chunks },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d1117] border border-[#21262d] p-3 rounded-lg">
            <p className="text-[11px] text-[#8b949e] font-medium mb-1">{label}</p>
            <p className="text-xl font-semibold text-[#e6edf3]">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] px-3.5 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#8b949e]">
          <Layers size={13} />
          <span className="text-xs">Avg density</span>
        </div>
        <span className="text-sm font-semibold text-[#e6edf3]">{avgChunks} chunks/file</span>
      </div>

      {/* Language breakdown */}
      {parsedLanguages.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[#21262d]">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Languages</p>

          {/* Bar */}
          <div className="h-2 w-full rounded-full bg-[#21262d] flex overflow-hidden">
            {parsedLanguages.map((lang) => (
              <div
                key={lang.name}
                style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                className="h-full transition-all duration-300"
                title={`${lang.rawName}: ${lang.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Language list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {parsedLanguages.map((lang) => (
              <div key={lang.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: lang.color }}
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  />
                  <span className="text-sm text-[#c9d1d9]">{lang.rawName}</span>
                </div>
                <span className="text-xs text-[#8b949e] font-mono">
                  {lang.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

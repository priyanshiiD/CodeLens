import { FileCode, ExternalLink } from 'lucide-react';
import { getFileName, getGithubSourceUrl } from '../../utils/format';

export default function SourceBadge({ source, repoUrl, index }) {
  const fileName = getFileName(source.file_path);
  const githubUrl = getGithubSourceUrl(repoUrl, source);

  const content = (
    <>
      <FileCode size={12} className="text-[#8b949e] flex-shrink-0" />
      <span className="text-[#58a6ff] font-medium truncate max-w-[160px]">{fileName}</span>
      <span className="text-[#8b949e] text-[10px] font-mono flex-shrink-0">
        L{source.start_line}–{source.end_line}
      </span>
      {githubUrl && <ExternalLink size={10} className="text-[#6e7681] flex-shrink-0" />}
    </>
  );

  const className = 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff]/40 rounded-md transition-all cursor-pointer font-sans';

  if (githubUrl) {
    return (
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={`Open ${source.file_path} on GitHub`}
      >
        {content}
      </a>
    );
  }
  return <span className={className}>{content}</span>;
}

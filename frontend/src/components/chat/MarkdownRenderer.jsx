import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

// Custom oneDark theme tuned to match the app's palette
const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0d1117',
    margin: 0,
    padding: '1rem',
    fontSize: '12.5px',
    lineHeight: '1.6',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '12.5px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
};

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="font-mono text-xs select-text rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117] my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d] bg-[#161b22]">
        <span className="text-[11px] text-[#8b949e] font-medium tracking-wide">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={11} className="text-[#3fb950]" />
              <span className="text-[#3fb950]">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Highlighted Code */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang || 'text'}
          style={codeTheme}
          PreTag="div"
          showLineNumbers={code.split('\n').length > 4}
          lineNumberStyle={{ color: '#484f58', minWidth: '2.5em', paddingRight: '1em', userSelect: 'none' }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-content select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeText = String(children).replace(/\n$/, '');

            // Fenced code block (has a language class or is multi-line)
            if (className || codeText.includes('\n')) {
              return <CodeBlock lang={lang} code={codeText} />;
            }
            // Inline code
            return (
              <code className="bg-[#161b22] border border-[#30363d] rounded px-1.5 py-0.5 text-[#e6edf3] font-mono text-[85%]" {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline">
              {children}
            </a>
          ),
          h2: ({ children }) => <h2 className="text-base font-semibold text-[#e6edf3] mt-5 mb-2 border-b border-[#21262d] pb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-[#e6edf3] mt-4 mb-1.5">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-5 space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1 my-2">{children}</ol>,
          li: ({ children }) => <li className="text-[#c9d1d9] leading-relaxed">{children}</li>,
          p: ({ children }) => <p className="leading-relaxed mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-[#e6edf3] font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#388bfd] pl-4 my-3 text-[#8b949e] italic">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

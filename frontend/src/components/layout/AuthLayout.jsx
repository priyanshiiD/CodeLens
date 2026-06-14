import './auth.css';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import AuthPreview from './AuthPreview';

const FEATURES = [
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M6 2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3.793l1.146-1.147a.5.5 0 01.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L6 6.293V2.5z" fill="#58a6ff"/>
        <path d="M1 11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0013.5 4H12a.5.5 0 000 1h1.5a.5.5 0 01.5.5v6a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-6a.5.5 0 01.5-.5H4a.5.5 0 000-1H2.5A1.5 1.5 0 001 5.5v6z" fill="#58a6ff"/>
      </svg>
    ),
    title: 'Semantic search',
    desc: 'Ask in plain English — no grep, no scrolling.',
  },
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v8.5a1.5 1.5 0 01-1.5 1.5H9l-3 3v-3H2.5A1.5 1.5 0 011 11V2.5z" stroke="#58a6ff" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Source citations',
    desc: 'Every answer links to the exact file and line.',
  },
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Any public GitHub repo',
    desc: 'Paste a URL — indexed in minutes, no setup.',
  },
];

export default function AuthLayout({ children }) {
  return (
    <div className="h-screen w-screen overflow-hidden flex relative auth-bg">

      {/* ── Background layers ── */}
      <div className="auth-dots absolute inset-0 pointer-events-none z-0" />
      <div className="auth-orb-1 pointer-events-none z-0" />
      <div className="auth-orb-2 pointer-events-none z-0" />
      <div className="auth-orb-bottom pointer-events-none z-0" />

      {/* ── LEFT: Product intro panel ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full flex-col relative z-10 border-r border-white/[0.06]">
        <div className="flex flex-col justify-between h-full px-12 py-8 max-w-[500px] mx-auto w-full overflow-hidden">

          {/* Logo */}
          <Link to="/" className="inline-flex hover:opacity-80 transition-opacity flex-shrink-0">
            <Logo size="xl" />
          </Link>

          {/* Main content — compressed to fit */}
          <div className="flex flex-col flex-shrink-0">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3fb950] bg-[#1a4731]/80 border border-[#2ea043]/40 px-2.5 py-1 rounded-full mb-4 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
              AI-powered code intelligence
            </span>

            {/* Headline */}
            <h1 className="text-[26px] font-semibold text-[#e6edf3] leading-[1.25] tracking-tight mb-3">
              Chat with any codebase,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] via-[#a5b4fc] to-[#79c0ff]">
                get instant answers.
              </span>
            </h1>

            {/* Description */}
            <p className="text-[13.5px] text-[#8b949e] leading-relaxed mb-5 max-w-[390px]">
              CodeLens indexes any public GitHub repository and lets you ask questions in plain English — with exact file and line citations.
            </p>

            {/* Feature list */}
            <ul className="space-y-3 mb-5">
              {FEATURES.map(({ icon, title, desc }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#1f2937]/80 border border-[#30363d] flex items-center justify-center flex-shrink-0">
                    {icon}
                  </span>
                  <span className="text-[13px] text-[#8b949e]">
                    <span className="text-[#c9d1d9] font-medium">{title}</span>
                    {' — '}{desc}
                  </span>
                </li>
              ))}
            </ul>

            {/* IDE Preview */}
            <AuthPreview />
          </div>

          {/* Footer */}
          <p className="text-[11px] text-[#6e7681] flex-shrink-0">
            © {new Date().getFullYear()} CodeLens · Built for engineers
          </p>
        </div>
      </div>

      {/* ── RIGHT: Auth form ── */}
      <div className="flex-1 h-full overflow-hidden flex flex-col items-center justify-center px-6 relative z-10">
        {/* Mobile-only logo */}
        <div className="lg:hidden mb-8">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>

        <p className="lg:hidden mt-8 text-xs text-[#6e7681]">
          © {new Date().getFullYear()} CodeLens
        </p>
      </div>
    </div>
  );
}

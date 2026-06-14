import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="h-screen app-bg flex flex-col items-center justify-center px-4 text-center">
      {/* Glow orb */}
      <div className="absolute w-64 h-64 bg-[#388bfd]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md">
        {/* 404 number */}
        <div className="text-[120px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#58a6ff] to-[#388bfd]/30 select-none mb-2">
          404
        </div>

        <h1 className="text-xl font-semibold text-[#e6edf3] mb-2">Page not found</h1>
        <p className="text-sm text-[#8b949e] leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="px-5 py-2.5 text-sm font-medium bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded-lg transition-colors cursor-pointer"
          >
            {user ? 'Back to Dashboard' : 'Go to Login'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-medium bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

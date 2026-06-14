import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function TopBar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#080d14]/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/dashboard" className="hover:opacity-85 transition-opacity flex-shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Right: User controls */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Avatar chip */}
            <div className="flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] hover:border-white/[0.18] transition-all cursor-default">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#388bfd] to-[#a5b4fc] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white leading-none">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-[#e6edf3] leading-none max-w-[120px] truncate">
                {user.name?.split(' ')[0]}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 border border-transparent hover:border-[#f85149]/20 transition-all cursor-pointer"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

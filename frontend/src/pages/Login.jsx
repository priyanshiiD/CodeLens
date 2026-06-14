import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';
import AuthCard from '../components/layout/AuthCard';
import Button from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');   // ← inline error state
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    try {
      setLoading(true);
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Incorrect email or password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to your CodeLens workspace."
        footer={
          <p className="text-sm text-[#8b949e]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#58a6ff] hover:text-[#79c0ff] font-medium transition-colors">
              Sign up for free
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Inline error banner ── */}
          {error && (
            <div className="flex items-start gap-2.5 bg-[#3d1a1a] border border-[#f85149]/40 text-[#ff7b72] text-sm px-3.5 py-3 rounded-lg animate-fade-in">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-[#e6edf3]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@company.com"
              disabled={loading}
              autoComplete="email"
              autoFocus
              className={`input-field ${error ? '!border-[#f85149]/60' : ''}`}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[#e6edf3]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
                className={`input-field pr-10 ${error ? '!border-[#f85149]/60' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="accent"
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          {/* Demo login */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#30363d]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0d1117] px-3 text-xs text-[#6e7681]">or</span>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setError('');
              try {
                setLoading(true);
                const result = await login('test@test.com', 'test123');
                if (result.success) navigate('/dashboard');
                else setError(result.error || 'Demo login failed.');
              } catch {
                setError('Something went wrong.');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full py-2.5 px-4 text-sm text-[#8b949e] hover:text-[#e6edf3] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff]/40 rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="text-base">🚀</span>
            Try with demo account
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

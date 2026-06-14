import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';
import AuthCard from '../components/layout/AuthCard';
import Button from '../components/ui/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const result = await register(name, email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');

  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        subtitle="Free to get started. No credit card required."
        footer={
          <p className="text-sm text-[#8b949e]">
            Already have an account?{' '}
            <Link to="/" className="text-[#58a6ff] hover:text-[#79c0ff] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Inline error banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-[#3d1a1a] border border-[#f85149]/40 text-[#ff7b72] text-sm px-3.5 py-3 rounded-lg animate-fade-in">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-[#e6edf3]">Full name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError(); }}
              placeholder="Alex Chen"
              disabled={loading}
              autoComplete="name"
              autoFocus
              className="input-field"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-[#e6edf3]">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              placeholder="you@company.com"
              disabled={loading}
              autoComplete="email"
              className="input-field"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[#e6edf3]">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="At least 6 characters"
                disabled={loading}
                autoComplete="new-password"
                className="input-field pr-10"
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
            <p className="text-xs text-[#6e7681]">Must be at least 6 characters</p>
          </div>

          <Button
            type="submit"
            variant="accent"
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

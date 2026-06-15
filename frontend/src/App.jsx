import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { setUnauthorizedHandler } from './api/client';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import NotFound from './pages/NotFound';
import Spinner from './components/ui/Spinner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center"><Spinner /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { 
    setUnauthorizedHandler(() => { 
      logout(); 
      navigate('/'); 
    }); 
  }, [logout, navigate]);

  return (
    <div className="app-bg min-h-screen">
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#161b22', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
        success: { iconTheme: { primary: '#3fb950', secondary: '#161b22' } },
        error: { iconTheme: { primary: '#f85149', secondary: '#161b22' } },
      }} />
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}

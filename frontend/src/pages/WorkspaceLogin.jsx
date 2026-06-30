import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Loader2, LogIn } from 'lucide-react';
import { companyAPI } from '../services/api';
import { saveWorkspaceSession, PAGE_KEY_TO_PATH } from '../hooks/useWorkspace';

export default function WorkspaceLogin() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const companyId       = searchParams.get('c');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!companyId) setError('Invalid workspace link — no company ID found.');
  }, [companyId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await companyAPI.workspaceLogin({ companyId, username: username.trim(), password });
      if (res.data.success) {
        saveWorkspaceSession(res.data.data, res.data.token);
        // Redirect to first allowed page
        const first = res.data.data.allowedPages?.[0];
        navigate(first ? (PAGE_KEY_TO_PATH[first] || '/dashboard') : '/dashboard', { replace: true });
      } else {
        setError(res.data.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Company Workspace</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your workspace credentials</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="your-username" autoFocus
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button type="submit" disabled={loading || !companyId}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-xl font-semibold text-sm transition">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          This is a company workspace — contact your company owner for access.
        </p>
      </div>
    </div>
  );
}

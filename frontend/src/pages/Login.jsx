import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { authAPI, clearAuthStorage } from '../services/api';
import { ShieldCheck, Loader2 } from 'lucide-react';

// ── Two-Factor verification step ─────────────────────────────────────────────
function TwoFactorStep({ tempToken, rememberMe, onSuccess, onCancel }) {
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError('Please enter your authenticator code.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyLogin2FA({ tempToken, otp: otp.trim() });
      if (res.data.success) {
        onSuccess(res.data, rememberMe);
      } else {
        setError(res.data.message || 'Verification failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 py-10 px-4">
      <SEOHead
        title="Log In — Sambid Federal Contract Platform"
        description="Log in to your Sambid account to view your daily matched federal contract opportunities, manage alerts, and track bids."
        keywords="login Sambid, federal contracting platform login, SAM.gov alert dashboard login"
        canonical="https://sambid.co/login"
      />
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
              Sambid Notify
            </span>
          </div>
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Two-Factor Verification</h1>
          <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
        </div>

        <Card className="shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Authenticator Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').substring(0, 8))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Or enter a backup code if you lost your device
              </p>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Verifying…
                </span>
              ) : 'Verify & Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Main Login page ───────────────────────────────────────────────────────────
export default function Login({ setIsAuthenticated, setUser }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors,   setErrors]   = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const navigate = useNavigate();

  const validateForm = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errs.email = 'Please enter a valid email address';
    if (!formData.password) errs.password = 'Password is required';
    return errs;
  };

  const finalizeLogin = async (data, remember) => {
    const { token, name, email, _id, plan, role } = data.data || data;
    clearAuthStorage();

    const store = remember ? localStorage : sessionStorage;
    store.setItem('authToken',  token);
    store.setItem('userEmail',  email);
    store.setItem('userName',   name);
    store.setItem('userId',     _id);
    store.setItem('userPlan',   plan);
    store.setItem('userRole',   role || 'user');

    setIsAuthenticated(true);
    setUser({ email, name, id: _id, plan, role });

    if (role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      try {
        const profileRes = await authAPI.getProfile();
        const needsOnboarding = !profileRes.data.data?.onboardingCompleted;
        navigate(needsOnboarding ? '/onboarding' : '/dashboard');
      } catch {
        navigate('/dashboard');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login({ email: formData.email, password: formData.password });

      if (response.data.success) {
        if (response.data.requiresTwoFactor) {
          setTempToken(response.data.tempToken);
          setTwoFactorPending(true);
        } else {
          await finalizeLogin(response.data, rememberMe);
        }
      } else {
        setErrors({ general: response.data.message || 'Login failed' });
      }
    } catch (error) {
      setErrors({ general: error.response?.data?.message || 'Login failed. Please check your credentials.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (twoFactorPending) {
    return (
      <TwoFactorStep
        tempToken={tempToken}
        rememberMe={rememberMe}
        onSuccess={(data) => finalizeLogin(data, rememberMe)}
        onCancel={() => { setTwoFactorPending(false); setTempToken(''); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 py-10 sm:py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
              Sambid Notify
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm sm:text-base text-gray-500">Sign in to your account to continue</p>
        </div>

        <Card className="shadow-xl">
          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => { setFormData({...formData, email: e.target.value}); setErrors(p => ({...p, email: '', general: ''})); }}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              showPasswordToggle
              value={formData.password}
              onChange={(e) => { setFormData({...formData, password: e.target.value}); setErrors(p => ({...p, password: '', general: ''})); }}
              error={errors.password}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up for free
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

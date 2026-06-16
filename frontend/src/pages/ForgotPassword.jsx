import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { authAPI } from '../services/api';
import SEOHead from '../components/SEOHead';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step,    setStep]    = useState(1); // 1 = enter email, 2 = enter OTP
  const [email,   setEmail]   = useState('');
  const [otp,     setOtp]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef([]);

  // ── Step 1: send OTP ─────────────────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setStep(2);
      startResendTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend countdown ─────────────────────────────────────────────────────────
  const startResendTimer = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      startResendTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit input handling ─────────────────────────────────────────────────
  const handleOtpChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const updated = [...otp];
    updated[idx] = value.slice(-1); // one digit per box
    setOtp(updated);
    setError('');
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────────
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyResetOtp(email.trim().toLowerCase(), code);
      navigate('/reset-password', { state: { resetToken: res.data.resetToken, email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <SEOHead
        title="Forgot Password — Reset Your Sambid Account"
        description="Reset your Sambid password to regain access to your federal contract opportunity dashboard and SAM.gov alerts."
        canonical="https://sambid.co/forgot-password"
        noindex={true}
      />
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            {step === 1 ? <Mail className="w-7 h-7 text-white" /> : <KeyRound className="w-7 h-7 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? 'Forgot your password?' : 'Enter your code'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 1
              ? "We'll send a 6-digit code to your email."
              : `We sent a code to ${email}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send code'}
              </button>
              <div className="text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* 6 digit boxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">6-digit code</label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => inputRefs.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                        digit ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      style={{ height: '52px' }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">Code expires in 15 minutes</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify code'}
              </button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">
                  Didn't receive it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCountdown > 0 || loading}
                    className="text-indigo-600 font-medium hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setOtp(['', '', '', '', '', '']); }}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

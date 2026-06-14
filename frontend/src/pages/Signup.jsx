// frontend/src/pages/Signup.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { authAPI } from '../services/api';

// ── Email validation helpers ──────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const DOMAIN_TYPOS = {
  // gmail
  'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.co': 'gmail.com',  'gmail.org': 'gmail.com', 'gmail.net': 'gmail.com',
  'gmial.com': 'gmail.com', 'gmai.com':  'gmail.com', 'gmali.com': 'gmail.com',
  'gmal.com':  'gmail.com', 'gmil.com':  'gmail.com', 'gmaill.com': 'gmail.com',
  'gmaill.com': 'gmail.com','gamil.com': 'gmail.com', 'gmaio.com':  'gmail.com',
  // yahoo
  'yaho.com': 'yahoo.com',  'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'yhoo.com': 'yahoo.com',  'yaaho.com':  'yahoo.com', 'yahoo.co':  'yahoo.com',
  // hotmail
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  // outlook
  'outlok.com': 'outlook.com',  'outllook.com': 'outlook.com', 'outook.com': 'outlook.com',
  'outlook.con': 'outlook.com', 'outolook.com': 'outlook.com',
  // icloud
  'iclud.com': 'icloud.com', 'iclould.com': 'icloud.com', 'icould.com': 'icloud.com',
};

// ── Password strength helpers ─────────────────────────────────────────────────
const getPasswordStrength = (password) => {
  if (!password) return null;

  const checks = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (password.length < 6) return { level: 0, label: 'Too Weak', color: 'bg-red-500',    text: 'text-red-600',    hint: 'Use at least 6 characters.' };
  if (score <= 2)           return { level: 1, label: 'Weak',     color: 'bg-orange-400', text: 'text-orange-600', hint: 'Add uppercase letters or numbers.' };
  if (score === 3)          return { level: 2, label: 'Fair',      color: 'bg-yellow-400', text: 'text-yellow-600', hint: 'Add a special character (!@#$…).' };
  if (score === 4)          return { level: 3, label: 'Strong',    color: 'bg-green-500',  text: 'text-green-600',  hint: 'Great password!' };
  return                           { level: 4, label: 'Very Strong', color: 'bg-green-600', text: 'text-green-700', hint: 'Excellent password!' };
};

function PasswordStrengthMeter({ password }) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Bars */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength.level + 1 ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {/* Label + hint */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${strength.text}`}>{strength.label}</span>
        <span className="text-xs text-gray-400">{strength.hint}</span>
      </div>
    </div>
  );
}

const validateEmailField = (email) => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Email is required';
  if (!trimmed.includes('@')) return 'Email must include @ (e.g. you@gmail.com)';
  if ((trimmed.match(/@/g) || []).length > 1) return 'Email can only have one @';
  const [local, domain] = trimmed.split('@');
  if (!local) return 'Missing username before @';
  if (!domain || !domain.includes('.')) return 'Email domain must have a dot (e.g. gmail.com)';
  const tld = domain.split('.').pop();
  if (tld.length < 2) return 'Email must end with a valid extension (.com, .org, .net…)';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
  if (DOMAIN_TYPOS[domain]) return `Did you mean ${local}@${DOMAIN_TYPOS[domain]}?`;
  return null;
};

export default function Signup({ setIsAuthenticated, setUser }) {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    password: '',
    confirmPassword: '',
    naicsCodes: '',
    referralCode: searchParams.get('ref') || '',
    supportRef: searchParams.get('supportRef') || '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupStep, setSignupStep] = useState(1);

  const navigate = useNavigate();

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    const emailError = validateEmailField(formData.email);
    if (emailError) newErrors.email = emailError;
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const s = getPasswordStrength(formData.password);
      if (s && s.level < 2) {
        newErrors.password = 'Password is too weak. Add uppercase letters, numbers, or symbols.';
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      const err = validateEmailField(formData.email);
      if (err) setErrors(prev => ({ ...prev, email: err }));
    }
  };

  const handleNaicsChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, naicsCodes: value }));
    if (errors.naicsCodes) {
      setErrors(prev => ({ ...prev, naicsCodes: '' }));
    }
  };

  const handleNext = () => {
    const validationErrors = validateStep1();
    if (Object.keys(validationErrors).length === 0) {
      setSignupStep(2);
    } else {
      setErrors(validationErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateStep2();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    // Convert NAICS codes string to array
    const naicsArray = formData.naicsCodes
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0 && /^\d+$/.test(code));
    
    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName || '',
        naicsCodes: naicsArray,
        referralCode: formData.referralCode?.trim().toUpperCase() || undefined,
        supportRef: formData.supportRef?.trim().toUpperCase() || undefined,
      });
      
      console.log('Signup response:', response.data);
      
      if (response.data.success) {
        const { token, name, email, _id, plan } = response.data.data;
        
        // Store token
        localStorage.setItem('authToken', token);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name);
        localStorage.setItem('userId', _id);
        localStorage.setItem('userPlan', plan);
        
        setIsAuthenticated(true);
        setUser({ email, name, id: _id, plan });
        // New users go through onboarding wizard
        navigate('/onboarding');
      } else {
        setErrors({ general: response.data.message || 'Signup failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      const msg = error.response?.data?.message || 'Signup failed. Please try again.';
      // Surface "already exists" errors directly on the email field so user sees it immediately
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already in use')) {
        setErrors({ email: msg, general: '' });
        setStep(1); // jump back to step 1 where the email field is visible
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Common NAICS codes suggestions
  const commonNaicsSuggestions = [
    { code: '541511', label: 'Custom Computer Programming Services' },
    { code: '541512', label: 'Computer Systems Design Services' },
    { code: '541513', label: 'Computer Facilities Management' },
    { code: '541519', label: 'Other Computer Related Services' },
    { code: '541611', label: 'Administrative Management Consulting' },
    { code: '236220', label: 'Commercial Building Construction' },
    { code: '238210', label: 'Electrical Contractors' },
    { code: '332999', label: 'Miscellaneous Fabricated Metal' },
    { code: '334419', label: 'Electronic Component Manufacturing' }
  ];

  const addNaicsSuggestion = (code) => {
    const currentCodes = formData.naicsCodes.split(',').map(c => c.trim()).filter(c => c);
    if (!currentCodes.includes(code)) {
      const newCodes = [...currentCodes, code].join(', ');
      setFormData(prev => ({ ...prev, naicsCodes: newCodes }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
              Sambid Notify
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm sm:text-base text-gray-500">Free trial — no credit card required</p>
        </div>

        <Card className="shadow-xl">
          {/* Step Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${signupStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                Step 1: Account
              </span>
              <span className={`text-sm ${signupStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                Step 2: Company
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: signupStep === 1 ? '50%' : '100%' }}
              ></div>
            </div>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {signupStep === 1 ? (
              <div className="space-y-5">
                <Input
                  label="Full Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="John Doe"
                />

                <Input
                  label="Email Address *"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  error={errors.email}
                  placeholder="you@company.com"
                />

                <div>
                  <Input
                    label="Password *"
                    type="password"
                    showPasswordToggle
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Create a strong password"
                  />
                  <PasswordStrengthMeter password={formData.password} />
                </div>

                <Input
                  label="Confirm Password *"
                  type="password"
                  showPasswordToggle
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  placeholder="Confirm your password"
                />

                <Button type="button" variant="primary" onClick={handleNext} className="w-full">
                  Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <Input
                  label="Business Name"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Your Company LLC"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NAICS Codes (Optional)
                  </label>
                  <textarea
                    name="naicsCodes"
                    value={formData.naicsCodes}
                    onChange={handleNaicsChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="541511, 541512, 541513"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter comma-separated NAICS codes for contract matching
                  </p>
                  
                  {/* Common NAICS Suggestions */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Common NAICS codes:</p>
                    <div className="flex flex-wrap gap-2">
                      {commonNaicsSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.code}
                          type="button"
                          onClick={() => addNaicsSuggestion(suggestion.code)}
                          className="text-xs bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 px-2 py-1 rounded transition-colors"
                          title={suggestion.label}
                        >
                          {suggestion.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referral Code <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    placeholder="Enter referral code (e.g. AB12CD34)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    maxLength={8}
                  />
                  {formData.referralCode && (
                    <p className="text-xs text-green-600 mt-1">Referral code applied!</p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                  />
                  <label className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setSignupStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
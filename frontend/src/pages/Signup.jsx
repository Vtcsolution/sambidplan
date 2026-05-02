// frontend/src/pages/Signup.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { authAPI } from '../services/api';

export default function Signup({ setIsAuthenticated, setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    password: '',
    confirmPassword: '',
    naicsCodes: '',
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
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
        naicsCodes: naicsArray
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
        navigate('/dashboard');
      } else {
        setErrors({ general: response.data.message || 'Signup failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Signup failed. Please try again.' });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">FedVantage Solutions</h1>
          <p className="text-gray-600">Create your free account</p>
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
                  error={errors.email}
                  placeholder="you@company.com"
                />

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
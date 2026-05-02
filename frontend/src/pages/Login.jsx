import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { authAPI } from '../services/api';

export default function Login({ setIsAuthenticated, setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { token, name, email, _id, plan, role } = response.data.data;
        
        // Store token based on remember me
        if (rememberMe) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userName', name);
          localStorage.setItem('userId', _id);
          localStorage.setItem('userPlan', plan);
          localStorage.setItem('userRole', role || 'user');
        } else {
          sessionStorage.setItem('authToken', token);
          sessionStorage.setItem('userEmail', email);
          sessionStorage.setItem('userName', name);
          sessionStorage.setItem('userId', _id);
          sessionStorage.setItem('userPlan', plan);
          sessionStorage.setItem('userRole', role || 'user');
        }
        
        console.log('User role saved:', role);
        console.log('Redirecting to:', role === 'admin' ? '/admin/dashboard' : '/dashboard');
        
        setIsAuthenticated(true);
        setUser({ email, name, id: _id, plan, role });
        
        // Redirect based on role - IMPORTANT: Use window.location for full page reload
        if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors({ general: response.data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Login failed. Please check your credentials.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">FedVantage Solutions</h1>
          <p className="text-gray-600">Welcome back! Please login to your account</p>
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
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              error={errors.email}
              required
            />
            
            <Input
              label="Password"
              type="password"
              showPasswordToggle
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              {isLoading ? 'Signing in...' : 'Sign In'}
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
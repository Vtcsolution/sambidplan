import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    // Handle password reset logic here
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">FedContractNotify</h1>
          <h2 className="text-2xl font-semibold">Reset Password</h2>
        </div>

        <Card>
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
              <p className="text-gray-600 mb-4">
                We've sent password reset instructions to {email}
              </p>
              <Link to="/login" className="text-indigo-600 hover:underline">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit}>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  error={error}
                />
                <Button type="submit" variant="primary" className="w-full">
                  Send Reset Link
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-indigo-600 hover:underline">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saferoute from '../assets/safe-route.png';

const API_BASE = 'http://localhost:5000/api/auth';

function LoginPage() {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetMessages = () => {
    setMessage('');
    setError('');
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isSignupMode) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isSignupMode ? 'signup' : 'login';
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Something went wrong.');
        return;
      }

      if (isSignupMode) {
        setMessage('Signup successful. You can log in now.');
        setIsSignupMode(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        localStorage.setItem('saferouteUser', JSON.stringify(data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div
        className="login-background"
        style={{ backgroundImage: `url(${saferoute})` }}
      />

      <div className="login-card-glass">
        <div className="brand-header">
          <h1>SafeRoute</h1>
          <p>Urban Safety Intelligence Platform</p>
        </div>

        <div className="form-container">
          <h2>{isSignupMode ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="form-subtitle">
            {isSignupMode
              ? 'Sign up using your email and password.'
              : 'Log in with your registered email and password.'}
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignupMode && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : isSignupMode ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="login-links login-links-center">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                resetMessages();
                setIsSignupMode(!isSignupMode);
                setPassword('');
                setConfirmPassword('');
              }}
            >
              {isSignupMode
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

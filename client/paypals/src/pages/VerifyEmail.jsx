import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Clock3 } from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-11 px-8"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const api = {
  baseURL: 'http://localhost:3000/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  async verifyEmail(token) {
    return this.request(`/verify-email/${token}`, {
      method: 'POST',
    });
  },
};

export default function VerifyEmail() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (currentUser) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new link.');
      return;
    }

    const verify = async () => {
      try {
        const response = await api.verifyEmail(token);
        if (response.status === 'success') {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully! You can now log in.');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to verify email. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Invalid or expired token. Please request a new link.');
      }
    };

    verify();
  }, [authLoading, currentUser, token, navigate]);

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-sm w-full p-6">
          <div className="text-center space-y-4 animate-pulse">
            <Clock3 className="w-14 h-14 text-slate-400 mx-auto" />
            <h2 className="text-xl font-medium text-slate-900">Verifying your email...</h2>
            <p className="text-base text-slate-600">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-sm w-full p-6">
        <div className="text-center space-y-4">
          {status === 'success' ? (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-xl font-medium text-slate-900">Verification Successful</h2>
              <p className="text-base text-slate-600">{message}</p>
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Clock3 className="w-14 h-14 text-slate-400 mx-auto" />
              <h2 className="text-xl font-medium text-slate-900">Verification Failed</h2>
              <p className="text-base text-slate-600">{message}</p>
              <Link to="/register">
                <Button variant="outline" className="w-full">
                  Request New Link
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
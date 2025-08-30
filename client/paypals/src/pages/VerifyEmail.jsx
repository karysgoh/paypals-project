import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Clock3 } from "lucide-react";
import { toast } from "react-toastify";

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
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',

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
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  async verifyEmail(token) {
    return this.request(`/verify-email/${token}`, {
      method: 'GET',
    });
  },

  async resendVerificationEmail(email) {
    return this.request(`/resend-verification`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
};

export default function VerifyEmail() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(sessionStorage.getItem("registrationEmail") || '');
  const [isResending, setIsResending] = useState(false);
  const verifyCalledRef = useRef(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (currentUser && currentUser.email_verified) {
      navigate('/dashboard', { replace: true });
      return;
    }

  const decodedToken = token ? decodeURIComponent(token) : token;
  if (decodedToken === 'invalid' || !decodedToken) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new link.');
      return;
    }

  const verify = async () => {
      try {
  const response = await api.verifyEmail(decodedToken);
        if (response.status === 'success') {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully! You can now log in.');
          setEmail(response.email || email); 
          sessionStorage.removeItem("registrationEmail"); 
          setCountdown(5);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to verify email. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.status === 400
            ? 'Invalid or expired token. Please request a new link.'
            : 'An error occurred. Please try again later.'
        );
      }
    };
    if (!verifyCalledRef.current) {
      verifyCalledRef.current = true;
      verify();
    }
  }, [authLoading, currentUser, token, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.assign('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      toast.error('Please enter your email address.');
      return;
    }
    setIsResending(true);
    try {
      const response = await api.resendVerificationEmail(email);
      setMessage(response.message || 'Verification email resent. Please check your inbox.');
      setStatus('success');
      toast.success(response.message || 'Verification email resent. Please check your inbox.');
      setTimeout(() => {
        setMessage('');
        setEmail('');
        setStatus('error'); 
      }, 5000);
    } catch (error) {
      setMessage('Failed to resend verification email. Please try again.');
      toast.error('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-0">
      <div className="max-w-sm sm:max-w-md w-full p-4 sm:p-6">
        <div className="text-center space-y-4">
          {status === 'success' ? (
            <>
                  <div className="w-full p-6 bg-green-50 rounded-lg flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">Verification Successful</h2>
                    {email && <p className="text-sm text-slate-700">Email verified: <strong>{email}</strong></p>}
                    <p className="text-base text-slate-600">You will be redirected to login in {countdown} second{countdown === 1 ? '' : 's'}.</p>
                    <div className="w-full">
                      <Link to="/login">
                        <Button variant="primary" className="w-full">
                          Go to Login Now
                        </Button>
                      </Link>
                      <Link to="/">
                        <Button variant="ghost" className="w-full mt-2">
                          Back to Home
                        </Button>
                      </Link>
                    </div>
                  </div>
            </>
          ) : (
            <>
              <Clock3 className="w-14 h-14 text-slate-400 mx-auto" />
              <h2 className="text-xl font-medium text-slate-900">Verification Failed</h2>
              <p className="text-base text-red-500">{message}</p>
              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                  disabled={isResending}
                />
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Clock3 className="w-5 h-5 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
                <Link to="/register">
                  <Button variant="outline" className="w-full">
                    Register Again
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
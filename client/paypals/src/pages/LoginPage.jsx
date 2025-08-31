import React, { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const LoginPage = () => {
  const { handleLogin, currentUser, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.email_verified) {
      navigate("/dashboard");
      return;
    }
    setNeedsVerification(true);
  }, [currentUser, navigate]);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const handleResend = async () => {
    if (!currentUser?.email) {
      setResendMsg('No email available to resend to.');
      return;
    }
    setIsResending(true);
    setResendMsg('');
    try {
      const res = await fetch(`${apiBase}/resend-verification`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to resend');
      setResendMsg(json.message || 'Verification email resent. Check your inbox.');
    } catch (e) {
      setResendMsg(e.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleLogin(formData);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-10 max-w-md w-full shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center">Login</h2>
        {needsVerification && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-slate-800">
            <p className="mb-2">Your account is logged in but your email is not verified yet. Please verify your email to access the dashboard.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleResend}
                className="px-3 py-2 bg-yellow-600 text-white rounded text-sm"
                disabled={isResending}
                aria-label="Resend verification email"
              >
                {isResending ? 'Resending...' : 'Resend verification email'}
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  navigate('/');
                }}
                className="px-3 py-2 bg-slate-100 text-slate-800 rounded text-sm"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
            {resendMsg && <p className="mt-2 text-sm text-slate-700">{resendMsg}</p>}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-2"
              htmlFor="username"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-slate-400"
              required
              aria-describedby="form-error"
            />
          </div>

          <div>
            <label
                className="block text-sm font-medium text-slate-700 mb-2"
                htmlFor="password"
            >
                Password
            </label>
            <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                  aria-describedby="form-error"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-transparent absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

          {error && (
            <p className="text-red-500 text-sm" id="form-error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            aria-label="Login"
          >
            Login
          </Button>

          <div className="text-sm text-center text-slate-600">
            Don't have an account?&nbsp;&nbsp;&nbsp;
            <button
              onClick={() => navigate("/register")}
              className="text-white hover:underline font-medium"
              type="button"
              aria-label="Navigate to register page"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
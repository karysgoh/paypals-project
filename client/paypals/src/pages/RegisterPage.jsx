import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-10 px-6 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-8"
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

  async register({ username, password, email }) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
  },
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Notification hook
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    if (currentUser && currentUser.email_verified) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
        setFormData({ username: "", password: "", confirmPassword: "", email: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showNotification("Passwords do not match", 'error');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await api.register({
        username: formData.username,
        password: formData.password,
        email: formData.email,
      });
      showNotification(response.message || "Verification email sent. Please check your inbox.", 'success');
      sessionStorage.setItem("registrationEmail", formData.email);
      
      // Redirect to verification page after successful registration
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000); // Give user time to see success message
    } catch (error) {
      console.error("Register failed:", error);
      
      // Enhanced error handling for different conflict types
      if (error.status === 400) {
        showNotification("Invalid input. Please check your username or email.", 'error');
      } else if (error.status === 409) {
        // For registration, conflicts are usually username or email
        showNotification("Username or email already exists. Please choose different credentials.", 'error');
      } else {
        showNotification("Registration failed. Please try again.", 'error');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: "Weak", message: "Password is empty" };
    if (password.length < 8) return { strength: "Weak", message: "Password must be at least 8 characters" };

    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (!hasUpperCase || !hasDigit || !hasSpecialChar) {
      const missing = [];
      if (!hasUpperCase) missing.push("uppercase letter");
      if (!hasDigit) missing.push("number");
      if (!hasSpecialChar) missing.push("special character");
      return { strength: "Moderate", message: `Add ${missing.join(", ")} for a stronger password` };
    }

    return { strength: "Strong", message: "Password is strong!" };
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-slate-50" style={{ width: '100%' }}>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={hideNotification} 
      />
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-10 max-w-md w-full shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 text-center">Register</h2>
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base text-green-500">{success}</p>
            <p className="text-sm text-slate-600">Please open the verification link from your email to continue.</p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/login")}
              aria-label="Go to login page"
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label
                className="block text-base font-medium text-slate-700 mb-2"
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
                className="w-full px-4 py-3 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
                aria-describedby="form-error"
                disabled={isRegistering}
              />
            </div>

            <div>
              <label
                className="block text-base font-medium text-slate-700 mb-2"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                  aria-describedby="form-error"
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-transparent absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isRegistering}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <p
                  className={`text-sm mt-1 ${
                    getPasswordStrength(formData.password).strength === "Weak"
                      ? "text-red-500"
                      : getPasswordStrength(formData.password).strength === "Moderate"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {getPasswordStrength(formData.password).message}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-base font-medium text-slate-700 mb-2"
                htmlFor="confirmPassword"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                  aria-describedby="form-error"
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="bg-transparent absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 hover:text-slate-900"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  disabled={isRegistering}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-base font-medium text-slate-700 mb-2"
                htmlFor="email"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
                aria-describedby="form-error"
                disabled={isRegistering}
              />
            </div>

            {error && (
              <p className="text-red-500 text-base" id="form-error" role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              aria-label="Register"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>

            <div className="text-base text-center text-slate-600">
              Already have an account?&nbsp;&nbsp;&nbsp;
              <button
                onClick={() => navigate("/login")}
                className="text-white hover:underline font-medium"
                type="button"
                aria-label="Navigate to login page"
                disabled={isRegistering}
              >
                Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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

const RegisterPage = () => {
  const navigate = useNavigate();
  const { handleRegister, currentUser } = useAuth();
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

  useEffect(() => {
    if (currentUser && !isRegistering) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, navigate, isRegistering]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsRegistering(true);
    try {
      const response = await handleRegister({
        username: formData.username,
        password: formData.password,
        email: formData.email,
      });
      setSuccess(response.message || "Verification email sent. Please check your inbox.");
    } catch (error) {
      console.error("Register failed:", error);
      console.log("Error object:", { message: error.message, status: error.status });
      setError(
        error.message && typeof error.message === "string"
          ? error.message
          : "Registration failed. Please try a different username or email."
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-10 max-w-md w-full shadow-sm">
        <h2 className="text-4xl font-bold text-slate-900 mb-6 text-center">Register</h2>
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
                aria-describedby="username-error"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                  aria-describedby="password-error"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                  aria-describedby="confirmPassword-error"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
                aria-describedby="email-error"
                disabled={isRegistering}
              />
            </div>

            {error && (
              <p className="text-red-500 text-base" id="form-error">
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
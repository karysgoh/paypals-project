import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
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

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await handleRegister({
        username: formData.username,
        password: formData.password,
        email: formData.email,
      });
      navigate("/profile");
    } catch (error) {
      console.error("Register failed:", error);
      console.log("Error object:", { message: error.message, status: error.status });
      setError(
        error.message && typeof error.message === "string"
          ? error.message
          : "Registration failed. Please try a different username or email."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-10 max-w-md w-full shadow-sm">
        <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Register</h2>
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
              className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              required
              aria-describedby="username-error"
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
                aria-describedby="password-error"
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

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-2"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none"
                required
                aria-describedby="confirmPassword-error"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="bg-transparent absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-2"
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
              className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              required
              aria-describedby="email-error"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm" id="form-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            aria-label="Register"
          >
            Register
          </Button>

          <div className="text-sm text-center text-slate-600">
            Already have an account?&nbsp;&nbsp;&nbsp;
            <button
              onClick={() => navigate("/login")}
              className="text-white hover:underline font-medium"
              type="button"
              aria-label="Navigate to login page"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
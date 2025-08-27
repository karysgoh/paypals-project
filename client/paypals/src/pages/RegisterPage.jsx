import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

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
      navigate("/");
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
    <div className="h-screen flex items-center justify-center px-4 font-sans">
      <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-md font-medium mb-1" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
          </div>

          <div>
            <label className="block text-md font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-white dark:bg-[#2e2e2e] border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 focus:ring-2"
              />
              <label htmlFor="showPassword" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Show password
              </label>
            </div>
          </div>

          <div>
            <label className="block text-md font-medium mb-1" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="showConfirmPassword"
                checked={showConfirmPassword}
                onChange={(e) => setShowConfirmPassword(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-white dark:bg-[#2e2e2e] border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="showConfirmPassword" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Show password
              </label>
            </div>
          </div>

          <div>
            <label className="block text-md font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
          </div>

          {error && <p className="text-red-500 text-md">{error}</p>}

          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md"
          >
            Register
          </button>

          <button
            type="button"
            onClick={handleGuestClick}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md"
          >
            Continue as Guest
          </button>

          <div className="text-md text-center mt-2">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-red-500 hover:underline"
              type="button"
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
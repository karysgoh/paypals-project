import React, { useState, useContext, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const { handleLogin, handleLogout, handleGuestLogin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleLogoutClick = async () => {
    await handleLogout();
    navigate("/");
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
    <div className="h-screen flex items-center justify-center px-4 font-sans">
      <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-10 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-md font-medium mb-1"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
          </div>

          <div>
            <label
              className="block text-md font-medium mb-1"
              htmlFor="password"
            >
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
                className="w-4 h-4 text-red-600 bg-white dark:bg-[#2e2e2e] border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="showPassword" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Show password
              </label>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-large py-2 px-4 rounded-md"
          >
            Login
          </button>

          <div className="text-md text-center mt-2">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-red-500 hover:underline"
              type="button"
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

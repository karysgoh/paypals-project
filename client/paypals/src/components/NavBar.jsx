import React from "react";
import { DollarSign } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

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

const NavBar = () => {
  const { currentUser, handleLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = (e) => {
    if (e.type === "click" || (e.type === "keydown" && e.key === "Enter")) {
      navigate("/");
    }
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleLogoClick}
          onKeyDown={handleLogoClick}
          role="button"
          tabIndex={0}
          aria-label="Navigate to home page"
        >
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">PayPals</span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <Button variant="primary" size="md" onClick={handleLogout} aria-label="Sign out">
              Sign Out
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/login")}
                aria-label="Sign in"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/register")}
                aria-label="Get started"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
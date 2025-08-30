import React from "react";
import { DollarSign } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import Button from "../ui/Button";

const NavBar = () => {
  const { currentUser, handleLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = (e) => {
    if (e.type === "click" || (e.type === "keydown" && e.key === "Enter")) {
      navigate("/");
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 py-2">
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
            <span className="text-lg sm:text-xl font-semibold text-slate-900">PayPals</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
      </div>
    </nav>
  );
};

export default NavBar;
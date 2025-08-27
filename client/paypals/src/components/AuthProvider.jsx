import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function normalizeUser(user) {
    return {
      ...user,
      role_id: typeof user.role_id === "string" ? Number(user.role_id) : user.role_id,
    };
  }

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("http://localhost:3000/api/me", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Unauthenticated");

        const user = await res.json();
        setCurrentUser(normalizeUser(user));
        console.log("Auto-login user fetched:", user);
      } catch (err) {
        console.log("No active session or invalid token");
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMe();
  }, []);

  async function handleLogin(credentials) {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Login failed:", errorData);
      throw new Error(errorData.message || "Login failed");
    }

    const data = await res.json();
    const { user } = data;

    setCurrentUser(normalizeUser(user));
  }

  async function handleRegister(credentials) {
    try {
      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Registration failed:", errorData);

        let errorMessage = "Registration failed";
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].msg; 
        } else if (errorData.message) {
          errorMessage = errorData.message; 
        }

        const error = new Error(errorMessage);
        error.status = res.status; 
        throw error;
      }

      const data = await res.json();
      const { user } = data;

      setCurrentUser(normalizeUser(user));
      return data;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async function handleLogout() {
    console.log("Logging out...");
    await fetch("http://localhost:3000/api/logout", {
      method: "POST",
      credentials: "include",
    });

    setCurrentUser(null);
  }

  function hasRole(...roleNames) {
    if (!currentUser) return false;
    const currentRole = currentUser.role_name;
    return roleNames.includes(currentRole);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        handleLogin,
        handleRegister,
        handleLogout,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

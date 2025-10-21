import React from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./components/AuthProvider";
import { AuthProvider } from "./components/AuthProvider";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Circles from "./pages/Circles";
import CircleDetail from "./pages/CircleDetail";
import SampleCircle from "./pages/SampleCircle";
import AllTransactions from "./pages/AllTransactions";
import LandingPage from "./pages/LandingPage";
import NavBar from "./components/NavBar";
import VerifyEmail from "./pages/VerifyEmail";
import Tutorial from "./pages/Tutorial";
import ExternalTransaction from "./pages/ExternalTransaction";
import TransactionPayment from "./pages/TransactionPayment";
import PaymentSettings from "./pages/PaymentSettings";

// ProtectedRoute component to handle authentication checks
const ProtectedRoute = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

// Layout component to include NavBar on all pages
const MainLayout = () => (
  <div className="min-h-screen w-full">
    <NavBar />
    <Outlet />
  <Tutorial />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes - no layout wrapper needed */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          
          {/* Routes with MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/tutorial" element={<></>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/external/transaction/:token" element={<ExternalTransaction />} />
            <Route path="/external/pay/:token" element={<ExternalTransaction />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/transaction/:transactionId/pay" element={<TransactionPayment />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/circles" element={<Circles />} />
              <Route path="/circles/:id" element={<CircleDetail />} />
              <Route path="/circles/sample" element={<SampleCircle />} />
              <Route path="/transactions" element={<AllTransactions />} />
              <Route path="/settings/payment" element={<PaymentSettings />} />
            </Route>
          </Route>
          
          {/* Catch-all route for debugging */}
          <Route path="*" element={
            <div style={{padding: '20px'}}>
              <h2>Route Not Found</h2>
              <p>Current path: {window.location.pathname}</p>
              <p>Available routes include: /, /login, /register, /verify-email, /dashboard</p>
              <a href="/" style={{color: 'blue', textDecoration: 'underline'}}>Go to Home</a>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
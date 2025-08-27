import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Circles from "./pages/Circles";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/Circles" element={<Circles />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
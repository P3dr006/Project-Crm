import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { Dashboard } from "./pages/dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from 'sonner';


export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes - Everything inside here requires a Token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Future protected routes like /profile or /settings would go here */}
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div className="p-10 text-center text-2xl">404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
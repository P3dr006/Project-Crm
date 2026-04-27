import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// This component wraps routes that require authentication
export function ProtectedRoute() {
  const { token } = useAuthStore();

  // If there is no token in our Zustand store, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes (Outlet)
  return <Outlet />;
}
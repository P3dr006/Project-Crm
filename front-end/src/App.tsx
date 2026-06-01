import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Kanban } from "./pages/Kanban";
import { Profile } from "./pages/Profile";
import { Agenda } from "./pages/Agenda";
import { Clients } from "./pages/Clients";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import { api } from "./services/api";
import type { Lead } from "./types/lead";

// Runs silently in the background on every page.
// Checks every 60s and fires a toast when a callback is due within 5 minutes.
function CallbackNotifier() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    const check = async () => {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const res = await api.get(`/leads?size=100&callback_start=${today}&callback_end=${today}`);
        const leads: Lead[] = res.data.leads || res.data;

        leads.forEach((lead) => {
          if (!lead.next_contact_date) return;
          if (lead.status === "Lost" || lead.status === "Converted") return;

          const scheduled = new Date(lead.next_contact_date);
          const diffMinutes = (scheduled.getTime() - now.getTime()) / 60_000;

          // Fire once when within 5 min window (and not more than 30 min overdue)
          if (diffMinutes <= 5 && diffMinutes > -30 && !notified.current.has(lead.id)) {
            notified.current.add(lead.id);
            toast(`📞 Call ${lead.full_name}`, {
              description: `${lead.phone} · scheduled for ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
              duration: 12000,
            });
          }
        });
      } catch {
        // Silently ignore — network errors should not surface here
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <CallbackNotifier />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes - Everything inside here requires a Token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/clients" element={<Clients />} />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div className="p-10 text-center text-2xl">404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/profile", label: "Profile" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-8 flex justify-between items-center h-16">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Orbit Dash</h1>
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname === to
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-500">
          <strong className="text-gray-900">{user?.full_name}</strong>
        </span>
        <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-500 transition">
          Sign out
        </button>
      </div>
    </nav>
  );
}
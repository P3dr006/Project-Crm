import { useAuthStore } from "../store/authStore";

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-gray-200 p-4 flex justify-between items-center px-8">
      <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Orbit Dash</h1>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-500">
          Logged in as <strong className="text-gray-900">{user?.full_name}</strong>
        </span>
        <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-500 transition">
          Sign out
        </button>
      </div>
    </nav>
  );
}
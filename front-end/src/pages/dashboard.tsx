import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Clears Zustand and LocalStorage
    navigate("/login"); // Sends user back
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">CRMAX Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, <strong>{user?.full_name}</strong></span>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="p-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Leads Management</h2>
          <p className="text-gray-500">Table and lead data will be implemented here next.</p>
        </div>
      </main>
    </div>
  );
}
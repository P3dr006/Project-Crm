import { create } from "zustand";
import { persist } from "zustand/middleware";

// Defining the shape of our User based on the Python UserResponse schema
interface User {
  id: string;
  full_name: string;
  email: string; 
  plan: string;
  role: string;
  created_at: string;
}

// Defining the shape of our Global State
interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  
  // Function to update partial user data (e.g., changing name in profile)
  updateUser: (data: Partial<User>) => void; 
}

// Creating the Global Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      
      // Function to call upon successful login/register
      setAuth: (user, token) => set({ user, token }),
      
      // Function to wipe data when leaving
      logout: () => {
        set({ user: null, token: null });
        // Optionally redirect to login here, or let the router handle it
      },
      
      // Helper function to check if someone is logged in
      isAuthenticated: () => !!get().token,

      // Function to update specific user fields without needing a full re-login
      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      })),
    }),
    {
      name: "auth-storage", // The secure key used in localStorage
    }
  )
);
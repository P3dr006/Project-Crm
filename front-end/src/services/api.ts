import axios from "axios";
// Importing the store to access actions outside of a React component
import { useAuthStore } from "../store/authStore"; 

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR: Attaches the JWT token before every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR: Catches 401 errors globally
api.interceptors.response.use(
  (response) => {
    // If the request is successful, let it pass
    return response;
  },
  (error) => {
    // If the server responds with 401 Unauthorized (Expired Token or Invalid)
    if (error.response && error.response.status === 401) {
      console.warn("Token expired or invalid. Logging out...");
      
      // Clear the Zustand store and localStorage
      useAuthStore.getState().logout();
      
      // Redirect the user back to the login page immediately
      window.location.href = "/login";
    }
    
    // Always reject the promise so the component calling the API knows it failed
    return Promise.reject(error);
  }
);
import axios from "axios";

// Creates a base instance pointing to our Python backend
export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically injects the JWT token before any request leaves
api.interceptors.request.use(
  (config) => {
    // Zustand's persist middleware saves our state inside this specific localStorage key
    const storageString = localStorage.getItem("auth-storage");
    
    if (storageString) {
      const storageData = JSON.parse(storageString);
      const token = storageData?.state?.token;
      
      // If the token exists, attach it to the VIP badge slot (Authorization header)
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
import axios from 'axios';
import { auth } from '../lib/firebase';

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check if the user is logged in
    const user = auth.currentUser;
    if (user) {
      // Get the Firebase ID token
      // forceRefresh is false by default, it will only refresh if expired
      const token = await user.getIdToken();
      // Attach the token to the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling (optional)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // You can handle global errors here, e.g., redirect to login on 401
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized request. Token might be invalid or expired.");
      // Optional: Handle logout/redirect logic
    }
    return Promise.reject(error);
  }
);

export default api;

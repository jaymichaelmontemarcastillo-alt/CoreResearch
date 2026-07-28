import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject Firebase Auth Token or Dev Token
api.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Fallback check for dev mode token stored in localStorage
        const devToken = localStorage.getItem('core_research_dev_token');
        if (devToken) {
          config.headers.Authorization = `Bearer ${devToken}`;
        }
      }
    } catch (error) {
      console.warn('[API Interceptor] Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Error 401] Unauthorized access - redirecting or clearing auth token');
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import { auth } from './firebase';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});

const api = axios.create({
  baseURL: env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject Firebase Auth Token or Dev Token
api.interceptors.request.use(
  async (config) => {
    try {
      // 1. Check for dev mode token first
      let usingDevToken = false;
      if (typeof localStorage !== 'undefined') {
        const devToken = localStorage.getItem('core_research_dev_token');
        if (devToken && devToken !== 'undefined' && devToken !== 'null') {
          config.headers.Authorization = `Bearer ${devToken}`;
          usingDevToken = true;
        }
      }

      // 2. Fallback to Firebase Auth Token if not in dev mode
      if (!usingDevToken) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken(true);
          config.headers.Authorization = `Bearer ${token}`;
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

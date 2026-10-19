import axios from 'axios';
import { auth } from './firebase';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});

const api = axios.create({
  baseURL: env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Shared refresh promise to prevent concurrent refresh loops across parallel requests
let refreshPromise = null;

// Interceptor to inject Firebase Auth Token or Dev Token
api.interceptors.request.use(
  async (config) => {
    try {
      // 1. Check for dev mode token first
      let usingDevToken = false;
      if (typeof localStorage !== 'undefined') {
        const devToken = localStorage.getItem('core_research_dev_token');
        if (devToken && devToken !== 'undefined' && devToken !== 'null') {
          if (config.headers?.set) {
            config.headers.set('Authorization', `Bearer ${devToken}`);
          } else {
            config.headers.Authorization = `Bearer ${devToken}`;
          }
          usingDevToken = true;
        }
      }

      // 2. Fallback to Firebase Auth Token if not in dev mode
      if (!usingDevToken) {
        // If this is a retried request that already has a fresh Authorization header, preserve it!
        const existingAuth = config.headers?.Authorization || (config.headers?.get && config.headers.get('Authorization'));
        if (config._retry && existingAuth) {
          return config;
        }

        let currentUser = auth.currentUser;
        if (!currentUser && typeof auth.authStateReady === 'function') {
          try {
            await auth.authStateReady();
            currentUser = auth.currentUser;
          } catch (readyErr) {
            console.warn('[API Interceptor] authStateReady error:', readyErr);
          }
        }
        if (currentUser) {
          // If a refresh is currently running, wait for the fresh token
          const token = refreshPromise ? await refreshPromise : await currentUser.getIdToken(false);
          if (config.headers?.set) {
            config.headers.set('Authorization', `Bearer ${token}`);
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      }
    } catch (error) {
      console.warn('[API Interceptor] Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Error Handling with 401 auto-refresh retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        let currentUser = auth.currentUser;
        if (!currentUser && typeof auth.authStateReady === 'function') {
          try {
            await auth.authStateReady();
            currentUser = auth.currentUser;
          } catch (readyErr) {
            console.warn('[API Error 401] authStateReady error:', readyErr);
          }
        }
        if (currentUser) {
          if (!refreshPromise) {
            refreshPromise = currentUser.getIdToken(true).finally(() => {
              refreshPromise = null;
            });
          }
          const freshToken = await refreshPromise;
          if (originalRequest.headers?.set) {
            originalRequest.headers.set('Authorization', `Bearer ${freshToken}`);
          } else if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('[API Error 401] Token refresh failed:', refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

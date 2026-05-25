import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Let the app state handle redirection instead of forced page reload,
        // or redirect to homepage if required.
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const login = (staffId, password) => {
  return apiClient.post('/auth/login', { staffId, password });
};

export const markAttendance = (latitude, longitude, timestamp, accuracy) => {
  return apiClient.post('/attendance/mark', {
    latitude,
    longitude,
    timestamp: timestamp || new Date().toISOString(),
    accuracy,
  });
};

export const getAttendanceRecords = (limit = 10, offset = 0) => {
  return apiClient.get('/attendance/records', {
    params: { limit, offset },
  });
};

export const getAllAttendanceRecords = (limit = 50, offset = 0) => {
  return apiClient.get('/attendance/records/all', {
    params: { limit, offset },
  });
};

export default apiClient;

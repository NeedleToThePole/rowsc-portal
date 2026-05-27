// ============================================================
// src/api/client.js
// Axios instance and API helper functions
// ============================================================
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.PROD 
    ? 'https://rowsc-api.onrender.com/api' // Replace with your live Render API URL once created
    : '/api', // Proxied via Vite config locally
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rowsc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if expired or unauthorized
      localStorage.removeItem('rowsc_token');
      localStorage.removeItem('rowsc_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // ── Authentication ──────────────────────────────────────────
  login: async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    if (res.data.token) {
      localStorage.setItem('rowsc_token', res.data.token);
      localStorage.setItem('rowsc_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('rowsc_token');
    localStorage.removeItem('rowsc_user');
    window.location.href = '/login';
  },

  verifyToken: async () => {
    const res = await client.get('/auth/verify');
    return res.data;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('rowsc_user');
    return user ? JSON.parse(user) : null;
  },

  // ── Students ────────────────────────────────────────────────
  getStudents: async (params = {}) => {
    const res = await client.get('/students', { params });
    return res.data;
  },

  getStudentById: async (id) => {
    const res = await client.get(`/students/${id}`);
    return res.data;
  },

  createStudent: async (studentData) => {
    const res = await client.post('/students', studentData);
    return res.data;
  },

  updateStudent: async (id, studentData) => {
    const res = await client.patch(`/students/${id}`, studentData);
    return res.data;
  },

  updateDriveLink: async (id, drive_link) => {
    const res = await client.patch(`/students/${id}/drive-link`, { drive_link });
    return res.data;
  },

  // ── Email ───────────────────────────────────────────────────
  sendEmail: async (emailData) => {
    const res = await client.post('/email/send', emailData);
    return res.data;
  },

  // ── Legacy Migration ────────────────────────────────────────
  migrateCsv: async (file) => {
    const formData = new FormData();
    formData.append('csv', file);

    const res = await client.post('/admin/migrate-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};

export default client;

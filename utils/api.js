import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
});


api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('token');
    const studentToken = localStorage.getItem('studentToken');
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isStudentRoute = pathname.startsWith('/student');
    const token = isStudentRoute ? (studentToken || adminToken) : (adminToken || studentToken);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('studentToken');
      localStorage.removeItem('adminClassId');

      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      } else if (window.location.pathname.startsWith('/student')) {
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentRoll');
        localStorage.removeItem('studentClassName');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

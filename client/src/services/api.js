import axios from 'axios';

const API_URL = 'https://student-log-register.onrender.com';
// const API_URL = 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// // Add response interceptor for error handling
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error('API Error:', {
//       url: error.config?.url,
//       method: error.config?.method,
//       status: error.response?.status,
//       message: error.response?.data?.message || error.message
//     });
//     return Promise.reject(error);
//   }
// );

// Auth API
export const auth = {
  signup: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => {
    localStorage.removeItem('token');
  },
  getCurrentUser: () => api.get('/api/auth/me')
};

// Students API
export const students = {
  create: (data) => api.post('/api/auth/register', data),
  getAll: () => api.get('/api/student'),
  getById: (id) => api.get(`/api/student/${id}`),
  getByClass: (className) => api.get(`/api/student/class/${className}`),
  update: (id, data) => api.patch(`/api/student/${id}`, data)
};

// Marks API
export const marks = {
  getAll: () => api.get('/api/marks'),
  getByClass: (className) => api.get(`/api/marks/class/${className}`),
  getByStudent: (studentId) => api.get(`/api/marks/student/${studentId}`),
  create: (data) => api.post('/api/marks', data),
  update: (id, data) => api.patch(`/api/marks/${id}`, data),
  delete: (id) => api.delete(`/api/marks/${id}`),
  bulkAdd: (data) => api.post('/api/marks/bulk', data)
};

// Attendance API
export const attendance = {
  getAll: () => api.get('/api/attendance'),
  getByClass: (className) => api.get(`/api/attendance/class/${className}`),
  getByDate: (date) => api.get(`/api/attendance/date/${date}`),
  getByDateAndClass: (date, className) => api.get(`/api/attendance/date/${date}/class/${className}`),
  getByStudent: (studentId) => api.get(`/api/attendance/student/${studentId}`),
  create: (data) => api.post('/api/attendance', data),
  update: (id, data) => api.patch(`/api/attendance/${id}`, data),
  delete: (id) => api.delete(`/api/attendance/${id}`),
  markAttendance: (data) => api.post('/api/attendance/mark', data),
  bulkMark: (data) => api.post('/api/attendance/bulk', data)
};

// Reports API
const formatDateString = (date) => {
  if (!date) {
    console.warn('formatDateString received empty date:', date);
    return '';
  }
  let d = date;
  if (typeof date === 'string') {
    d = new Date(date);
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    console.warn('formatDateString received invalid date:', date);
    return '';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const reports = {
  getAttendanceReport: async (className, startDate, endDate) => {
    try {
      console.log('getAttendanceReport params:', { className, startDate, endDate });
      
      // Validate inputs
      if (!className) {
        throw new Error('Class name is required for report generation.');
      }
      
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required for report generation.');
      }
      
      // Format dates if they're not already formatted
      let formattedStartDate = startDate;
      let formattedEndDate = endDate;
      
      // If dates are Date objects, format them
      if (startDate instanceof Date) {
        formattedStartDate = formatDateString(startDate);
      }
      
      if (endDate instanceof Date) {
        formattedEndDate = formatDateString(endDate);
      }
      
      console.log('Formatted dates:', { formattedStartDate, formattedEndDate });
      
      if (!formattedStartDate || !formattedEndDate) {
        throw new Error('Start date or end date is invalid or missing.');
      }
      
      const token = localStorage.getItem('token');
      return await api.get(`/api/reports/attendance?className=${className}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('API getAttendanceReport error:', error);
      throw error;
    }
  },
  
  getMarksReport: async (className, examType) => {
    const token = localStorage.getItem('token');
    return await api.get(`/api/reports/marks?className=${className}&examType=${examType}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },
  
  getCombinedReport: async (className, examType, startDate, endDate) => {
    try {
      const formattedStartDate = formatDateString(startDate);
      const formattedEndDate = formatDateString(endDate);
      const token = localStorage.getItem('token');
      return await api.get(`/api/reports/combined?className=${className}&examType=${examType}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      throw error;
    }
  }
};

// Keep the individual exports for backward compatibility
export const getAttendanceReport = async (className, startDate, endDate) => {
  return reports.getAttendanceReport(className, startDate, endDate);
};

export const getMarksReport = async (className, examType) => {
  return reports.getMarksReport(className, examType);
};

export const getCombinedReport = async (className, examType, startDate, endDate) => {
  return reports.getCombinedReport(className, examType, startDate, endDate);
};

export const register = async (studentData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/student/register`,
      studentData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
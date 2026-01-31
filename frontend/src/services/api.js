import axios from 'axios'
import toast from 'react-hot-toast'

export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    // Handle Pydantic validation errors (array of objects)
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail
        .map(err => err.msg || JSON.stringify(err))
        .join(', ')
    }
    // Handle standard string error
    return error.response.data.detail
  }
  // Fallback
  return error.message || 'An unexpected error occurred'
}

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // DEMO MODE MOCK RESPONSE
    if (localStorage.getItem('demo_mode') === 'true') {
      const mockResponse = (data) => Promise.resolve({ data, status: 200 });
      
      // Mock /auth/me
      if (config.url.includes('/auth/me')) {
        config.adapter = () => mockResponse({
          id: 'demo-admin-id',
          email: 'admin@example.com',
          full_name: 'Demo Admin',
          role: 'super_admin',
          is_active: true
        });
      }
      
      // Mock /events list
      if (config.url.endsWith('/events') && config.method === 'get') {
        config.adapter = () => mockResponse([
          { id: '1', name: 'Demo Event', date: '2025-01-01', location: 'Demo Location', description: 'This is a demo event' }
        ]);
      }

      // Mock /guests list
      if (config.url.includes('/guests') && config.method === 'get') {
        config.adapter = () => mockResponse([
          { id: 'g1', full_name: 'John Doe', phone: '1234567890', email: 'john@example.com', checked_in: false },
          { id: 'g2', full_name: 'Jane Smith', phone: '0987654321', email: 'jane@example.com', checked_in: true }
        ]);
      }

      // Mock Layout API
      if (config.url.includes('/layout')) {
        // Get Layout
        if (config.method === 'get' && !config.url.includes('/tables')) {
           config.adapter = () => mockResponse({ tables: [] });
        }
        // Add Table
        if (config.method === 'post' && config.url.includes('/tables')) {
           const tableData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
           config.adapter = () => mockResponse({
               id: 'demo-table-' + Date.now(),
               ...tableData,
               seats: Array.from({ length: tableData.num_seats }).map((_, i) => ({
                   id: `seat-${Date.now()}-${i}`,
                   position: { x: 0, y: 0 }, 
                   status: 'unassigned',
                   guest_id: null
               }))
           });
        }
        // Update Layout/Table or Assign Seat
        if (config.method === 'put' || (config.method === 'post' && !config.url.includes('/tables'))) {
           config.adapter = () => mockResponse({ success: true });
        }
        // Delete Table
        if (config.method === 'delete') {
           config.adapter = () => mockResponse({ success: true });
        }
      }
      
      return config;
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    } else {
      // Don't show toast here if we want components to handle it, 
      // OR use the safe helper. 
      // For now, let's use the safe helper to prevent global crashes,
      // but we might want to suppress duplicate toasts if components also show them.
      // However, the current code WAS showing them, so let's keep behavior but make it safe.
      const message = getErrorMessage(error)
      // Avoid showing "Operation failed" or generic messages if possible, but here we have the specific one.
      // If the component handles it, we might double toast. 
      // But safety is priority #1.
      if (error.response?.data?.detail) {
         toast.error(message)
      } else if (error.message) {
         toast.error(error.message)
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  health: () => api.get('/health'),
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  createUser: (data) => api.post('/auth/users', data),
  listUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
}

// Events API
export const eventsAPI = {
  list: () => api.get('/events'),
  create: (data) => api.post('/events', data),
  get: (id) => api.get(`/events/${id}`),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  duplicate: (id, data) => api.post(`/events/${id}/duplicate`, data),
  getStaff: (id) => api.get(`/events/${id}/staff`),
  assignStaff: (id, data) => api.post(`/events/${id}/staff`, data),
}

// Guests API
export const guestsAPI = {
  list: (eventId, params) => api.get(`/events/${eventId}/guests`, { params }),
  create: (eventId, data) => api.post(`/events/${eventId}/guests`, data),
  get: (eventId, guestId) => api.get(`/events/${eventId}/guests/${guestId}`),
  update: (eventId, guestId, data) => api.put(`/events/${eventId}/guests/${guestId}`, data),
  delete: (eventId, guestId) => api.delete(`/events/${eventId}/guests/${guestId}`),
  import: (eventId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/events/${eventId}/guests/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  export: (eventId) => api.get(`/events/${eventId}/guests/export`, {
    responseType: 'blob',
  }),
  checkIn: (eventId, guestId) => api.post(`/events/${eventId}/checkin`, { guest_id: guestId }),
  checkOut: (eventId, guestId) => api.post(`/events/${eventId}/checkout`, { guest_id: guestId }),
}

// Layout API
export const layoutAPI = {
  get: (eventId) => api.get(`/events/${eventId}/layout`),
  update: (eventId, data) => api.put(`/events/${eventId}/layout`, data),
  addTable: (eventId, data) => api.post(`/events/${eventId}/layout/tables`, data),
  updateTable: (eventId, tableId, data) => api.put(`/events/${eventId}/layout/tables/${tableId}`, data),
  deleteTable: (eventId, tableId) => api.delete(`/events/${eventId}/layout/tables/${tableId}`),
  assignSeat: (eventId, data) => api.post(`/events/${eventId}/layout/assign-seat`, data),
  unassignSeat: (eventId, data) => api.post(`/events/${eventId}/layout/unassign-seat`, data),
}

// Reports API
export const reportsAPI = {
  attendance: (eventId) => api.get(`/events/${eventId}/reports/attendance`),
  exportExcel: (eventId) => api.get(`/events/${eventId}/reports/export/excel`, {
    responseType: 'blob',
  }),
  exportPDF: (eventId) => api.get(`/events/${eventId}/reports/export/pdf`, {
    responseType: 'blob',
  }),
}

export default api

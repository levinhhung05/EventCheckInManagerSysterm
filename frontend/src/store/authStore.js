import { create } from 'zustand'
import { authAPI } from '../services/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  // Initialize user from localStorage
  initialize: async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await authAPI.me()
        set({ user: response.data, token, isLoading: false })
      } catch (error) {
        localStorage.removeItem('token')
        set({ user: null, token: null, isLoading: false })
      }
    }
  },

  // Login
  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.login(credentials)
      const { access_token } = response.data
      
      localStorage.setItem('token', access_token)
      localStorage.removeItem('demo_mode') // Ensure demo mode is disabled
      
      // Fetch user data
      const userResponse = await authAPI.me()
      const user = userResponse.data
      
      set({ 
        user, 
        token: access_token, 
        isLoading: false,
        error: null 
      })
      
      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed'
      set({ 
        isLoading: false, 
        error: errorMessage,
        user: null,
        token: null 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Demo Login
  loginDemo: async () => {
    const demoUser = {
      id: 'demo-admin-id',
      email: 'admin@example.com',
      full_name: 'Demo Admin',
      role: 'super_admin',
      is_active: true
    }
    
    localStorage.setItem('token', 'demo-token')
    localStorage.setItem('demo_mode', 'true')
    
    set({ 
      user: demoUser, 
      token: 'demo-token', 
      isLoading: false, 
      error: null 
    })
    
    return { success: true, user: demoUser }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('demo_mode')
    set({ user: null, token: null })
  },

  // Change password
  changePassword: async (data) => {
    try {
      await authAPI.changePassword(data)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to change password' 
      }
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      await authAPI.forgotPassword(email)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to send reset link' 
      }
    }
  },

  // Reset password
  resetPassword: async (data) => {
    try {
      await authAPI.resetPassword(data)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to reset password' 
      }
    }
  },

  // Check if user is admin
  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin' || user?.role === 'super_admin'
  },

  // Check if user is super admin
  isSuperAdmin: () => {
    const { user } = get()
    return user?.role === 'super_admin'
  },

  // Check if user is staff
  isStaff: () => {
    const { user } = get()
    return user?.role === 'staff'
  },
}))

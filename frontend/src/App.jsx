import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { useAuthStore } from './store/authStore'

// Auth components
import Login from './components/auth/Login'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'

// Admin components
import AdminDashboard from './components/admin/AdminDashboard'
import DashboardOverview from './components/admin/DashboardOverview'
import EventList from './components/admin/EventList'
import EventDetail from './components/admin/EventDetail'
import LayoutBuilder from './components/admin/LayoutBuilder'
import GuestManagement from './components/admin/GuestManagement'
import UserManagement from './components/admin/UserManagement'
import StaffAssignment from './components/admin/StaffAssignment'
import ReportsView from './components/admin/ReportsView'

// Staff components
import StaffDashboard from './components/staff/StaffDashboard'
import CheckInView from './components/staff/CheckInView'

// Shared components
import ProtectedRoute from './components/shared/ProtectedRoute'
import LoadingScreen from './components/shared/LoadingScreen'

function App() {
  const { user, initialize, isLoading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/forgot-password" 
          element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/reset-password" 
          element={!user ? <ResetPassword /> : <Navigate to="/" replace />} 
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === 'staff' ? (
                <Navigate to="/staff" replace />
              ) : (
                <Navigate to="/admin" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="events/:eventId/layout" element={<LayoutBuilder />} />
          <Route path="events/:eventId/guests" element={<GuestManagement />} />
          <Route path="events/:eventId/staff" element={<StaffAssignment />} />
          <Route path="events/:eventId/reports" element={<ReportsView />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* Staff routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/staff/events" replace />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/:eventId/checkin" element={<CheckInView />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}

export default App

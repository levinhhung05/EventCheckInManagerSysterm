import { useEffect, useRef, useCallback, useMemo } from 'react'
import socketService from '../services/socket'
import { useAuthStore } from '../store/authStore'

export const useSocket = (eventId) => {
  const user = useAuthStore((state) => state.user)
  const handlersRef = useRef({})

  useEffect(() => {
    if (!eventId || !user) return

    // Connect and join event
    socketService.connect()
    socketService.joinEvent(eventId, user.id)

    // Cleanup
    return () => {
      socketService.leaveEvent(eventId)
      
      // Remove all registered handlers
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socketService.off(event, handler)
      })
      handlersRef.current = {}
    }
  }, [eventId, user])

  const on = useCallback((event, handler) => {
    socketService.on(event, handler)
    handlersRef.current[event] = handler
  }, [])

  const off = useCallback((event, handler) => {
    socketService.off(event, handler)
    delete handlersRef.current[event]
  }, [])

  const emit = useCallback((event, data) => {
    socketService.emit(event, data)
  }, [])

  return useMemo(() => ({ on, off, emit }), [on, off, emit])
}

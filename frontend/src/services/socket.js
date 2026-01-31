import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.eventHandlers = new Map()
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinEvent(eventId, userId) {
    if (!this.socket?.connected) {
      this.connect()
    }
    
    this.socket.emit('join_event', { event_id: eventId, user_id: userId })
  }

  leaveEvent(eventId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_event', { event_id: eventId })
    }
  }

  on(event, handler) {
    if (!this.socket) {
      this.connect()
    }
    
    this.socket.on(event, handler)
    
    // Store handler for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler)
    }
    
    // Remove from stored handlers
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event)
    }
    this.eventHandlers.delete(event)
  }
}

// Singleton instance
const socketService = new SocketService()

export default socketService

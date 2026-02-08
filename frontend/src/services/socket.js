import { io } from 'socket.io-client';

/**
 * Configuration
 * - VITE_API_URL: Loaded from .env file 
 * - Fallback: Defaults to localhost for local development on PC
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  /**
   * Initialize and connect to the Socket.IO server.
   * Implements Singleton pattern to ensure only one connection exists.
   */
  connect() {
    // Return existing socket if already connected
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log(`🔌 [SocketService] Connecting to: ${API_URL}`);

    // Initialize Socket.IO Client
    const token = localStorage.getItem('token') || '';
    this.socket = io(API_URL, {
      path: '/socket.io/',                // Must match the backend 'socketio_path'
      transports: ['polling', 'websocket'], // allow polling fallback before websocket
      autoConnect: true,
      reconnection: true,                 // Enable auto-reconnection
      reconnectionAttempts: 10,           // Retry up to 10 times
      reconnectionDelay: 1000,            // Wait 1s between retries
      auth: { token },                    // include JWT during handshake
    });

    // --- System Event Listeners (Debugging) ---

    this.socket.on('connect', () => {
      console.log('✅ [SocketService] Connected. ID:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ [SocketService] Disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ [SocketService] Connection Error:', err);
      try {
        if (err?.message) console.error('message:', err.message);
        if (err?.data) console.error('data:', err.data);
      } catch (e) {
        console.error('Error logging connect_error details', e);
      }
    });

    this.socket.on('error', (err) => {
      console.error('⚠️ [SocketService] Socket error event:', err);
    });

    return this.socket;
  }

  /**
   * Manually disconnect the socket.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🛑 [SocketService] Disconnected manually.');
    }
  }

  /**
   * Emits a 'join_event' signal to the backend to enter a specific room.
   * @param {string} eventId - The ID of the event room.
   * @param {string} userId - The ID of the current user (Staff).
   */
  joinEvent(eventId, userId) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    console.log(`➡️ [SocketService] Joining Room: ${eventId} as User: ${userId}`);
    this.socket.emit('join_event', { event_id: eventId, user_id: userId });
    
    // Debug connection status
    this.socket.on('connect', () => {
      console.log('✅ [SocketService] Connected to server');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log(`❌ [SocketService] Disconnected: ${reason}`);
    });
    
    this.socket.on('connect_error', (error) => {
      console.log(`⚠️ [SocketService] Connection error: ${error.message}`);
    });
  }

  /**
   * Emits a 'leave_event' signal to exit the room.
   */
  leaveEvent(eventId) {
    if (this.socket?.connected) {
      console.log(`⬅️ [SocketService] Leaving Room: ${eventId}`);
      this.socket.emit('leave_event', { event_id: eventId });
    }
  }

  /**
   * Register an event listener.
   * Wrapper for socket.on()
   * @param {string} event - Event name (e.g., 'guest_checked_in')
   * @param {function} handler - Callback function
   */
  on(event, handler) {
    if (!this.socket) {
      this.connect();
    }
    // Directly delegate to socket instance.
    // Socket.IO automatically handles re-binding listeners upon reconnection.
    this.socket.on(event, handler);
  }

  /**
   * Remove an event listener.
   * Wrapper for socket.off()
   * @param {string} event - Event name
   * @param {function} handler - The specific callback to remove
   */
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Send a message to the server.
   * Wrapper for socket.emit()
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ [SocketService] Cannot emit '${event}': Socket not connected.`);
    }
  }
}

// Export a single instance (Singleton) to be used throughout the app
const socketService = new SocketService();
export default socketService;
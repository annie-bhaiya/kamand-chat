import { io,Socket } from 'socket.io-client';
import { api } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Listener = (payload: unknown) => void;

export class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private lastTypingSent: number = 0;
  private isConnecting: boolean = false;

  connect(token: string) {
    if (this.socket) {
      if ((this.socket.auth as { token?: string })?.token === token) {
        if (!this.socket.connected && !this.isConnecting) {
          this.isConnecting = true;
          this.socket.connect();
        }
        return;
      }
      this.disconnect();
    }

    this.isConnecting = true;
    this.dispatch('connection:status', { connected: false, status: 'connecting' });

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.dispatch('connection:status', { connected: true, status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      this.dispatch('connection:status', { connected: false, status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      this.dispatch('connection:status', { connected: false, status: 'error', error: err.message });
    });

    // Real-time server events
    const serverEvents = [
      'campus:changed',
      'message:new',
      'message:updated',
      'message:deleted',
      'message:reaction',
      'conversation:updated',
      'conversation:removed',
      'conversation:read',
      'typing',
      'session:expired',
    ];

    for (const eventName of serverEvents) {
      this.socket.on(eventName, (payload: unknown) => {
        if (eventName === 'session:expired') {
          // Token expired, attempt refresh
          api.refreshTokenIfNeeded().then((newToken) => {
            if (newToken && this.socket) {
              this.socket.auth = { token: newToken };
              this.socket.disconnect().connect();
            }
          });
        }
        this.dispatch(eventName, payload);
      });
    }
  }

  updateToken(token: string) {
    if (this.socket) {
      this.socket.auth = { token };
      this.socket.disconnect().connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.lastTypingSent = 0;
      this.dispatch('connection:status', { connected: false, status: 'disconnected' });
    }
  }

  on<T>(event: string, listener: (payload: T) => void) {
    const wrapped: Listener = payload => listener(payload as T);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(wrapped);
    return () => this.off(event, wrapped);
  }

  off(event: string, listener: Listener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private dispatch(event: string, payload: unknown) {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in socket event listener [${event}]:`, err);
        }
      }
    }
  }

  emitTyping(conversationId: string, isTyping: boolean) {
    if (!this.socket || !this.socket.connected) return;

    const now = Date.now();
    // Throttle positive typing events to once per second
    if (isTyping && now - this.lastTypingSent < 1000) {
      return;
    }

    if (isTyping) {
      this.lastTypingSent = now;
    }

    this.socket.emit(
      'typing',
      { conversation_id: conversationId, is_typing: isTyping }
    );
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export const socketManager = new SocketManager();

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let onlineListenersBound = false;

type ConnectionFailedListener = (failed: boolean) => void;
const connectionFailedListeners = new Set<ConnectionFailedListener>();
let connectionFailed = false;

function setConnectionFailed(failed: boolean): void {
  if (connectionFailed === failed) return;
  connectionFailed = failed;
  connectionFailedListeners.forEach((listener) => listener(failed));
}

export function subscribeConnectionFailed(listener: ConnectionFailedListener): () => void {
  connectionFailedListeners.add(listener);
  listener(connectionFailed);
  return () => connectionFailedListeners.delete(listener);
}

function bindOnlineListeners(): void {
  if (onlineListenersBound || typeof window === 'undefined') return;
  onlineListenersBound = true;

  window.addEventListener('online', () => {
    if (socket && !socket.connected) socket.connect();
  });
  window.addEventListener('offline', () => {
    socket?.disconnect();
  });
}

export function getSocket(): Socket {
  if (!socket) {
    const isAdmin = window.location.pathname.startsWith('/admin');
    const token = isAdmin
      ? localStorage.getItem('admin_token')
      : localStorage.getItem('user_token');

    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '') ?? '';

    socket = io(baseUrl, {
      path: '/socket.io',
      auth: { token: token ?? '' },
      autoConnect: navigator.onLine,
      reconnection: navigator.onLine,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnectionFailed(false));
    socket.on('reconnect_failed', () => setConnectionFailed(true));

    bindOnlineListeners();
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  setConnectionFailed(false);
}

export type { Socket };

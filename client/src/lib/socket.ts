import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const isAdmin = window.location.pathname.startsWith('/admin');
    const token = isAdmin
      ? localStorage.getItem('admin_token')
      : localStorage.getItem('user_token');

    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)
      ?.replace('/api', '') ?? '';

    socket = io(baseUrl, {
      path: '/socket.io',
      auth: { token: token ?? '' },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export type { Socket };

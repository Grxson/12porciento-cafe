import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketServer | null = null;

export type EventName =
  | 'new_order'
  | 'order_status_changed'
  | 'new_review'
  | 'review_approved'
  | 'new_reply'
  | 'subscription_created'
  | 'subscription_cancelled';

export interface SocketEvent {
  event: EventName;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  targetUserId?: string;
}

export function initSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket: Socket) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
        if (payload.role === 'ADMIN') {
          socket.join('admin');
        } else {
          socket.join(`user:${payload.id}`);
        }
      } catch {
        // invalid token — no room
      }
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

export function emitEvent(event: SocketEvent): void {
  if (!io) return;

  if (event.targetUserId) {
    io.to(`user:${event.targetUserId}`).emit(event.event, event);
    io.to('admin').emit(event.event, event);
  } else {
    io.to('admin').emit(event.event, event);
  }
}

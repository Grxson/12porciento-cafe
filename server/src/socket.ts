import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { prisma } from './db';
import { getUserSubscriptions, getAdminSubscriptions, cleanupSubscription } from './lib/push';

let io: SocketServer | null = null;

// In-memory rate limiter: userId -> eventType -> timestamp
const pushRateMap = new Map<string, Map<string, number>>();

function checkPushRate(userId: string, eventType: string): boolean {
  const userMap = pushRateMap.get(userId) ?? new Map();
  const last = userMap.get(eventType) ?? 0;
  const now = Date.now();
  if (now - last < 5000) return false; // 5 second cooldown
  userMap.set(eventType, now);
  pushRateMap.set(userId, userMap);
  return true;
}

// Clean up rate map periodically (prevent memory leak)
setInterval(() => {
  const cutoff = Date.now() - 30000; // 30s
  for (const [userId, userMap] of pushRateMap) {
    for (const [eventType, ts] of userMap) {
      if (ts < cutoff) userMap.delete(eventType);
    }
    if (userMap.size === 0) pushRateMap.delete(userId);
  }
}, 60000);

export type EventName =
  | 'new_order'
  | 'order_status_changed'
  | 'new_review'
  | 'review_approved'
  | 'new_reply'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'low_stock';

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
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role?: string };
        if (payload.role === 'USER') {
          socket.join(`user:${payload.id}`);
        } else {
          // Admin tokens have no role field
          socket.join('admin');
        }
      } catch {
        // invalid token — no room
      }
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

export async function emitEvent(event: SocketEvent): Promise<void> {
  if (!io) return;

  // Socket.IO dispatch (existing)
  if (event.targetUserId) {
    io.to(`user:${event.targetUserId}`).emit(event.event, event);
    io.to('admin').emit(event.event, event);
  } else {
    io.to('admin').emit(event.event, event);
  }

  // Push notification dispatch (non-blocking, fire-and-forget)
  dispatchPushNotifications(event).catch((err) =>
    console.error('[PUSH] dispatch error:', err),
  );
}

async function dispatchPushNotifications(event: SocketEvent): Promise<void> {
  const subs = event.targetUserId
    ? await getUserSubscriptions(event.targetUserId)
    : await getAdminSubscriptions();

  if (subs.length === 0) return;

  // For admin events, load preference map to filter by event type
  let prefMap: Map<string, boolean> | null = null;
  if (!event.targetUserId) {
    const adminIds = [...new Set(subs.filter((s: { userId: string | null }) => s.userId).map((s: { userId: string | null }) => s.userId!))];
    if (adminIds.length > 0) {
      const prefs = await prisma.adminNotificationPreference.findMany({
        where: { adminId: { in: adminIds }, eventType: event.event },
      });
      prefMap = new Map(prefs.map((p: { adminId: string; enabled: boolean }) => [p.adminId, p.enabled]));
    }
  }

  let sent = 0;
  let failed = 0;
  let expired = 0;

  const payload = JSON.stringify({
    title: event.title,
    message: event.message,
    event: event.event,
    data: { ...event.data, url: event.data?.url ?? getDefaultUrl(event.event) },
    timestamp: new Date().toISOString(),
  });

  for (const sub of subs) {
    // Check admin preference for this event type
    if (prefMap && sub.userId && prefMap.get(sub.userId) === false) {
      continue; // Admin disabled this event type
    }

    // Rate limit per user per event type
    if (sub.userId && !checkPushRate(sub.userId, event.event)) {
      continue;
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (pushErr: unknown) {
      const webPushErr = pushErr as { statusCode?: number; message?: string };
      if (webPushErr.statusCode === 410 || webPushErr.statusCode === 404) {
        await cleanupSubscription(sub.id);
        expired++;
        console.log(`[PUSH] expired subscription cleaned: ${sub.id}`);
      } else {
        failed++;
        console.warn(`[PUSH] send error for ${sub.id}: ${webPushErr.message}`);
      }
    }
  }

  if (sent > 0 || expired > 0) {
    console.log(`[PUSH] event=${event.event} sent=${sent} failed=${failed} expired=${expired}`);
  }
}

function getDefaultUrl(event: EventName): string {
  switch (event) {
    case 'new_order':
    case 'order_status_changed':
      return '/admin/orders';
    case 'new_review':
    case 'review_approved':
      return '/admin/reviews';
    case 'new_reply':
      return '/admin/reviews';
    case 'subscription_created':
    case 'subscription_cancelled':
      return '/admin/subscriptions';
    case 'low_stock':
      return '/admin/inventory';
    default:
      return '/';
  }
}

import { prisma } from '../db';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function saveSubscription(
  data: PushSubscriptionData,
  userId?: string,
  userAgent?: string,
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userId: userId ?? null,
      userAgent: userAgent ?? null,
    },
    update: {
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userId: userId ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

export async function removeSubscription(endpoint: string) {
  try {
    await prisma.pushSubscription.delete({ where: { endpoint } });
  } catch {
    // Ignore if not found
  }
}

export async function getUserSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

export async function getAdminSubscriptions() {
  // Admins are users with no userId (anonymous) or linked to admin users
  // For now, return all subscriptions (both user and anonymous)
  return prisma.pushSubscription.findMany();
}

export async function cleanupSubscription(id: string) {
  try {
    await prisma.pushSubscription.delete({ where: { id } });
  } catch {
    // Ignore if already deleted
  }
}

export async function getSubscriptionByEndpoint(endpoint: string) {
  return prisma.pushSubscription.findUnique({ where: { endpoint } });
}

export async function getAdminPreferences(adminId: string): Promise<Record<string, boolean>> {
  const prefs = await prisma.adminNotificationPreference.findMany({
    where: { adminId },
  });
  const result: Record<string, boolean> = {};
  for (const p of prefs) {
    result[p.eventType] = p.enabled;
  }
  return result;
}

export async function upsertAdminPreference(
  adminId: string,
  eventType: string,
  enabled: boolean,
) {
  return prisma.adminNotificationPreference.upsert({
    where: { adminId_eventType: { adminId, eventType } },
    create: { adminId, eventType, enabled },
    update: { enabled },
  });
}

export async function seedDefaultAdminPreferences(adminId: string) {
  const eventTypes = [
    'new_order',
    'order_status_changed',
    'new_review',
    'review_approved',
    'new_reply',
    'subscription_created',
    'subscription_cancelled',
    'low_stock',
  ];
  for (const eventType of eventTypes) {
    await prisma.adminNotificationPreference.upsert({
      where: { adminId_eventType: { adminId, eventType } },
      create: { adminId, eventType, enabled: true },
      update: {},
    });
  }
}

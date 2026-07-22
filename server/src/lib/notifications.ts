import { prisma } from '../db';
import webpush from 'web-push';
import { getUserSubscriptions } from './push';

export type NotificationType = 'FOLLOW' | 'LIKE_BREW' | 'ACHIEVEMENT_UNLOCK';

interface CreateNotificationParams {
  userId: string; // recipient
  type: NotificationType;
  actorId?: string; // who triggered it
  actorName?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface PushPayload {
  title: string;
  message: string;
  event: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Create an in-app notification and send a web-push notification to all user's devices.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, type, actorId, actorName, title, message, data } = params;

  // 1. Persist in-app notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
      title,
      message,
      data: (data as object) ?? undefined,
      read: false,
    },
  });

  // 2. Check user push preferences (opt-out for push)
  const prefs = await prisma.userNotificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  const pushEnabled = prefs?.pushEnabled ?? true;
  if (!pushEnabled) return;

  // 3. Check if user has push subscriptions
  const subscriptions = await getUserSubscriptions(userId);
  if (subscriptions.length === 0) return;

  // 4. Send web-push to all user's devices
  const payload: PushPayload = {
    title,
    message,
    event: type,
    data,
    timestamp: new Date().toISOString(),
  };

  const promises = subscriptions.map((sub) =>
    webpush
      .sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      .catch((err: { statusCode?: number }) => {
        // 410 Gone = subscription expired, 404 = unknown
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Cleanup expired subscription asynchronously
          import('./push').then(({ cleanupSubscription }) => {
            cleanupSubscription(sub.id).catch(() => {});
          });
        }
        // Silently ignore other errors (don't fail the notification creation)
      }),
  );

  await Promise.allSettled(promises);
}

/**
 * Notify user that someone followed them.
 */
export async function notifyFollow(
  userId: string,
  followerId: string,
  followerName: string,
): Promise<void> {
  if (userId === followerId) return; // Don't notify self-follow
  await createNotification({
    userId,
    type: 'FOLLOW',
    actorId: followerId,
    actorName: followerName,
    title: 'Nuevo seguidor',
    message: `${followerName} comenzó a seguirte`,
    data: { followerId },
  });
}

/**
 * Notify brew owner that someone liked their brew.
 */
export async function notifyLikeBrew(
  brewOwnerUserId: string,
  likerId: string,
  likerName: string,
  brewId: string,
  recipeName: string,
): Promise<void> {
  if (brewOwnerUserId === likerId) return;
  await createNotification({
    userId: brewOwnerUserId,
    type: 'LIKE_BREW',
    actorId: likerId,
    actorName: likerName,
    title: 'A alguien le gustó tu brew',
    message: `${likerName} le dio like a "${recipeName}"`,
    data: { brewId, likerId },
  });
}

/**
 * Notify user that they unlocked an achievement.
 */
export async function notifyAchievementUnlock(
  userId: string,
  achievementName: string,
  achievementIcon: string,
): Promise<void> {
  await createNotification({
    userId,
    type: 'ACHIEVEMENT_UNLOCK',
    title: `${achievementIcon} Logro desbloqueado`,
    message: `¡Felicidades! Has desbloqueado "${achievementName}"`,
    data: {},
  });
}

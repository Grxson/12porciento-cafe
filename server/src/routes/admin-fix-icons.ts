import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const TEXT_TO_EMOJI: Record<string, string> = {
  coffee: '☕',
  target: '🎯',
  zap: '⚡',
  star: '⭐',
  flame: '🔥',
  fire: '🔥',
  graduate: '🎓',
  sunrise: '🌅',
  moon: '🌙',
  trophy: '🏆',
  gift: '🎁',
  medal: '🏅',
  sword: '⚔️',
  swords: '⚔️',
  heart: '❤️',
  like: '👍',
  check: '✅',
  close: '❌',
  edit: '✏️',
  trash: '🗑️',
  delete: '🗑️',
  plus: '➕',
  add: '➕',
  minus: '➖',
  remove: '➖',
  lock: '🔒',
  unlock: '🔓',
  user: '👤',
  home: '🏠',
  search: '🔍',
  mail: '📧',
  camera: '📷',
  image: '🖼️',
  clock: '🕐',
  calendar: '📅',
  cart: '🛒',
  bag: '🛍️',
  truck: '🚚',
  save: '💾',
  download: '⬇️',
  upload: '⬆️',
  settings: '⚙️',
  gear: '⚙️',
  info: 'ℹ️',
  help: '❓',
  alert: '⚠️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  menu: '📋',
  eye: '👁️',
};

const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})$/u;
const isEmoji = (s: string) => emojiRegex.test(s.trim());

function normalizeIcon(icon: string): string | null {
  const trimmed = icon.trim();
  if (!trimmed || isEmoji(trimmed)) return null;
  const key = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  return TEXT_TO_EMOJI[key] || TEXT_TO_EMOJI[trimmed] || null;
}

// POST /api/admin/fix-icons — fix text icon names → emoji in DB
router.post('/fix-icons', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    type FixRow = { id: string; icon: string };
    const results: {
      model: string;
      count: number;
      details: { id: string; old: string; new: string }[];
    }[] = [];

    // Achievement
    const achievements = (await prisma.achievement.findMany({
      select: { id: true, icon: true },
    })) as FixRow[];
    const achFixes: { id: string; old: string; new: string }[] = [];
    for (const a of achievements) {
      const n = normalizeIcon(a.icon);
      if (n) {
        await prisma.achievement.update({ where: { id: a.id }, data: { icon: n } });
        achFixes.push({ id: a.id, old: a.icon, new: n });
      }
    }
    results.push({ model: 'Achievement', count: achFixes.length, details: achFixes });

    // BaristaTitle
    const titles = (await prisma.baristaTitle.findMany({
      select: { id: true, icon: true },
    })) as FixRow[];
    const titleFixes: { id: string; old: string; new: string }[] = [];
    for (const t of titles) {
      const n = normalizeIcon(t.icon);
      if (n) {
        await prisma.baristaTitle.update({ where: { id: t.id }, data: { icon: n } });
        titleFixes.push({ id: t.id, old: t.icon, new: n });
      }
    }
    results.push({ model: 'BaristaTitle', count: titleFixes.length, details: titleFixes });

    // Reward
    const rewards = (await prisma.reward.findMany({
      select: { id: true, icon: true },
    })) as FixRow[];
    const rewardFixes: { id: string; old: string; new: string }[] = [];
    for (const r of rewards) {
      const n = normalizeIcon(r.icon);
      if (n) {
        await prisma.reward.update({ where: { id: r.id }, data: { icon: n } });
        rewardFixes.push({ id: r.id, old: r.icon, new: n });
      }
    }
    results.push({ model: 'Reward', count: rewardFixes.length, details: rewardFixes });

    const total = results.reduce((s, r) => s + r.count, 0);
    res.json({ fixed: total, details: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

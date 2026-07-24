#!/usr/bin/env -S npx tsx
/**
 * Fix icon fields: convert text names to emoji in Achievement, BaristaTitle, Reward
 *
 * Usage:
 *   npx tsx prisma/fix-icons.ts          # dry run (preview only)
 *   npx tsx prisma/fix-icons.ts --apply  # actually update DB
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const shouldApply = process.argv.includes('--apply');

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
  settings: '⚙️',
  gear: '⚙️',
  user: '👤',
  profile: '👤',
  home: '🏠',
  search: '🔍',
  mail: '📧',
  email: '📧',
  info: 'ℹ️',
  help: '❓',
  alert: '⚠️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  camera: '📷',
  image: '🖼️',
  photo: '🖼️',
  clock: '🕐',
  calendar: '📅',
  cart: '🛒',
  bag: '🛍️',
  truck: '🚚',
  save: '💾',
  download: '⬇️',
  upload: '⬆️',
  plus: '➕',
  add: '➕',
  minus: '➖',
  remove: '➖',
  edit: '✏️',
  trash: '🗑️',
  delete: '🗑️',
  lock: '🔒',
  unlock: '🔓',
  eye: '👁️',
  menu: '📋',
  more: '⋯',
  default: '🏆',
};

const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})$/u;
const isEmoji = (s: string) => emojiRegex.test(s.trim());

function normalizeIcon(icon: string): string | null {
  const trimmed = icon.trim();
  if (!trimmed) return null;

  // Already emoji — keep as-is
  if (isEmoji(trimmed)) return null;

  // Try mapping
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  return TEXT_TO_EMOJI[normalized] || TEXT_TO_EMOJI[trimmed] || null;
}

interface FixResult {
  model: string;
  count: number;
  records: { id: string; oldIcon: string; newIcon: string }[];
}

async function fixModel<T extends { id: string; icon: string }>(
  name: string,
  findMany: () => Promise<T[]>,
  updateOne: (id: string, icon: string) => Promise<unknown>,
): Promise<FixResult> {
  const all = await findMany();
  const fixes: FixResult['records'] = [];

  for (const record of all) {
    const newIcon = normalizeIcon(record.icon);
    if (newIcon) {
      fixes.push({ id: record.id, oldIcon: record.icon, newIcon });
      if (shouldApply) {
        await updateOne(record.id, newIcon);
      }
    }
  }

  return { model: name, count: fixes.length, records: fixes };
}

async function main() {
  console.log(`\n🔍 Icon fix script (${shouldApply ? 'APPLY' : 'DRY RUN'})`);

  const fixes = await Promise.all([
    fixModel(
      'Achievement',
      () =>
        prisma.achievement.findMany({ select: { id: true, icon: true } }) as Promise<
          { id: string; icon: string }[]
        >,
      (id, icon) => prisma.achievement.update({ where: { id }, data: { icon } }),
    ),
    fixModel(
      'BaristaTitle',
      () =>
        prisma.baristaTitle.findMany({ select: { id: true, icon: true } }) as Promise<
          { id: string; icon: string }[]
        >,
      (id, icon) => prisma.baristaTitle.update({ where: { id }, data: { icon } }),
    ),
    fixModel(
      'Reward',
      () =>
        prisma.reward.findMany({ select: { id: true, icon: true } }) as Promise<
          { id: string; icon: string }[]
        >,
      (id, icon) => prisma.reward.update({ where: { id }, data: { icon } }),
    ),
  ]);

  let total = 0;
  for (const f of fixes) {
    console.log(`\n  ${f.model}: ${f.count} records to fix`);
    for (const r of f.records) {
      console.log(`    ${r.id.slice(0, 8)}…  "${r.oldIcon}" → "${r.newIcon}"`);
    }
    total += f.count;
  }

  if (total === 0) {
    console.log('\n✅ No icons need fixing — all already emoji.');
  } else if (!shouldApply) {
    console.log(`\n⚠️  ${total} icon(s) would be fixed. Run with --apply to commit changes.`);
  } else {
    console.log(`\n✅ Fixed ${total} icon(s).`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌', e);
  prisma.$disconnect();
  process.exit(1);
});

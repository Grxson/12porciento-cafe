/** Map text icon names to emoji. Returns emoji if already emoji. */
const TEXT_EMOJI_MAP: Record<string, string> = {
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

export function toEmoji(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '🏆';
  // Already emoji
  if (emojiRegex.test(trimmed)) return trimmed;
  // Try map
  const key = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  return TEXT_EMOJI_MAP[key] || TEXT_EMOJI_MAP[trimmed] || trimmed;
}

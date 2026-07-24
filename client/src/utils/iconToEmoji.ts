/** Normalize icon string — map text names to emoji for use in strings/toasts */
export function iconToEmoji(icon?: string | null): string {
  if (!icon) return '🏆';

  const map: Record<string, string> = {
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
    user: '👤',
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
  };

  const trimmed = icon.trim();
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})$/u;

  // Already emoji
  if (emojiRegex.test(trimmed)) return trimmed;

  // Look up in map
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  return map[normalized] || map[trimmed] || trimmed;
}

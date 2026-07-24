import React from 'react';

declare let require: (module: string) => unknown;

let ReiconModule: Record<string, React.FC<{ size?: number; className?: string }>> | null = null;
try {
  // reicon-react is a runtime dep — Vite polyfills require for ESM
  ReiconModule = require('reicon-react') as Record<string, unknown> as Record<
    string,
    React.FC<{ size?: number; className?: string }>
  >;
} catch {
  // reicon not available — use emoji/text fallback
}

const iconMap: Record<string, string> = {
  '☕': 'Coffee',
  '🎯': 'Target',
  '⚡': 'Zap',
  '⭐': 'Star',
  '🔥': 'Flame',
  '🎓': 'Graduate',
  '🌅': 'Sunrise',
  '🌙': 'Moon',
  '⚔️': 'Swords',
  '🏆': 'Trophy',
  '🎁': 'Gift',
  '🏅': 'Medal',
  coffee: 'Coffee',
  target: 'Target',
  zap: 'Zap',
  star: 'Star',
  flame: 'Fire',
  graduate: 'Graduate',
  sunrise: 'Sunrise',
  moon: 'Moon',
  trophy: 'Trophy',
  gift: 'Gift',
  medal: 'Medal',
  sword: 'Swords',
  swords: 'Swords',
  fire: 'Flame',
  heart: 'Heart',
  like: 'Heart',
  check: 'Check',
  close: 'Close',
  edit: 'Edit',
  trash: 'Trash',
  delete: 'Trash',
  lock: 'Lock',
  unlock: 'Unlock',
  plus: 'Plus',
  add: 'Plus',
  minus: 'Minus',
  remove: 'Minus',
  settings: 'Settings',
  gear: 'Settings',
  user: 'User',
  profile: 'User',
  home: 'Home',
  search: 'Search',
  mail: 'Mail',
  email: 'Mail',
  info: 'Info',
  help: 'Help',
  alert: 'AlertTriangle',
  warning: 'AlertTriangle',
  success: 'CheckCircle',
  error: 'AlertCircle',
  camera: 'Camera',
  image: 'Image',
  photo: 'Image',
  menu: 'Menu',
  more: 'MoreHorizontal',
  clock: 'Clock',
  calendar: 'Calendar',
  cart: 'ShoppingCart',
  bag: 'ShoppingBag',
  truck: 'Truck',
  save: 'Save',
  download: 'Download',
  upload: 'Upload',
  default: 'Star',
};

const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})$/u;
const isEmoji = (s: string) => emojiRegex.test(s.trim());

interface AdminIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export default function AdminReiconIcon({ icon, size = 24, className }: AdminIconProps) {
  if (!icon) {
    return <span className={className}>🏆</span>;
  }

  const trimmed = icon.trim();

  // Emoji — render directly
  if (isEmoji(trimmed)) {
    return (
      <span className={className} style={{ fontSize: size }}>
        {trimmed}
      </span>
    );
  }

  // Try mapping to reicon component
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  const componentName = iconMap[normalized] || iconMap[trimmed] || iconMap.default;

  if (ReiconModule && componentName && ReiconModule[componentName]) {
    const IconComponent = ReiconModule[componentName];
    return <IconComponent size={size} className={className} />;
  }

  // Fallback: render raw string
  return (
    <span className={className} style={{ fontSize: size }}>
      {trimmed}
    </span>
  );
}

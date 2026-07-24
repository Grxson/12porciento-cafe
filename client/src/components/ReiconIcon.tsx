import React from 'react';

// Dynamic import fallback — try reicon, fallback to emoji text
declare let require: (module: string) => unknown;
let ReiconModule: Record<string, React.FC<{ size?: number; className?: string }>> | null = null;
try {
  // Dynamic require for reicon-react — silent fail if not installed
  ReiconModule = require('reicon-react') as typeof ReiconModule;
} catch {
  // reicon not available, use emoji fallback
}

// Map common icon names/emojis to reicon component names
const iconMap: Record<string, string> = {
  // Emoji → reicon name
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

  // Text labels → reicon name
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
  check_circle: 'CheckCircle',
  close: 'Close',
  x: 'Close',
  settings: 'Settings',
  gear: 'Settings',
  user: 'User',
  profile: 'User',
  home: 'Home',
  search: 'Search',
  bell: 'Notification',
  notification: 'Notification',
  clock: 'Clock',
  time: 'Clock',
  calendar: 'Calendar',
  date: 'Calendar',
  cart: 'ShoppingCart',
  shopping_cart: 'ShoppingCart',
  bag: 'ShoppingBag',
  package: 'Package',
  box: 'Package',
  truck: 'Truck',
  delivery: 'Truck',
  map: 'Map',
  location: 'MapPin',
  pin: 'MapPin',
  phone: 'Phone',
  mail: 'Mail',
  email: 'Mail',
  message: 'Message',
  chat: 'Message',
  comment: 'Message',
  share: 'Share',
  link: 'Link',
  image: 'Image',
  photo: 'Image',
  camera: 'Camera',
  video: 'Video',
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  refresh: 'Refresh',
  reload: 'Refresh',
  sync: 'Refresh',
  download: 'Download',
  upload: 'Upload',
  plus: 'Plus',
  add: 'Plus',
  minus: 'Minus',
  remove: 'Minus',
  edit: 'Edit',
  pencil: 'Edit',
  write: 'Edit',
  trash: 'Trash',
  delete: 'Trash',
  save: 'Save',
  lock: 'Lock',
  unlock: 'Unlock',
  eye: 'Eye',
  view: 'Eye',
  hide: 'EyeOff',
  info: 'Info',
  help: 'Help',
  question: 'Help',
  warning: 'AlertTriangle',
  alert: 'AlertTriangle',
  danger: 'AlertTriangle',
  error: 'AlertCircle',
  success: 'CheckCircle',
  done: 'CheckCircle',
  confirm: 'Check',
  menu: 'Menu',
  more: 'MoreHorizontal',
  list: 'List',
  grid: 'Grid',
  filter: 'Filter',
  sort: 'ArrowUpDown',
  arrow_up: 'ArrowUp',
  arrow_down: 'ArrowDown',
  arrow_left: 'ArrowLeft',
  arrow_right: 'ArrowRight',
  chevron_up: 'ChevronUp',
  chevron_down: 'ChevronDown',
  chevron_left: 'ChevronLeft',
  chevron_right: 'ChevronRight',
  book: 'Book',
  book_open: 'BookOpen',
  document: 'File',
  file: 'File',
  folder: 'Folder',
  tag: 'Tag',
  label: 'Tag',
  credit_card: 'CreditCard',
  card: 'CreditCard',
  dollar: 'Dollar',
  money: 'Dollar',
  percent: 'Percent',
  discount: 'Percent',
  graph: 'BarChart',
  chart: 'BarChart',
  analytics: 'BarChart',
  trend: 'TrendingUp',
  trending_up: 'TrendingUp',
  trending_down: 'TrendingDown',
  // Default fallback for names not in map
  default: 'Star',
};

// Emoji range regex
const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})$/u;
const isEmoji = (s: string) => emojiRegex.test(s.trim());

interface ReiconIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export default function ReiconIcon({ icon, size = 24, className }: ReiconIconProps) {
  if (!icon) {
    return <span className={className}>🏆</span>;
  }

  const trimmed = icon.trim();

  // If it's already an emoji, render directly
  if (isEmoji(trimmed)) {
    return (
      <span className={className} style={{ fontSize: size }}>
        {trimmed}
      </span>
    );
  }

  // Try to map to reicon component
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '_');
  const componentName = iconMap[normalized] || iconMap[trimmed] || iconMap.default;

  // Try rendering with reicon
  if (ReiconModule && componentName && (ReiconModule as Record<string, unknown>)[componentName]) {
    const IconComponent = (
      ReiconModule as Record<string, React.FC<{ size?: number; className?: string }>>
    )[componentName];
    return <IconComponent size={size} className={className} />;
  }

  // Fallback: render as text (it might be an emoji the regex didn't catch)
  return (
    <span className={className} style={{ fontSize: size }}>
      {trimmed}
    </span>
  );
}

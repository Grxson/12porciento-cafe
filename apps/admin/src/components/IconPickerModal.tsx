import React, { useState, useMemo, useCallback } from 'react';

declare let require: (module: string) => unknown;

// Curated icon subset — relevant for achievements, rewards, barista use cases
const ICON_LIST = [
  'Coffee',
  'Star',
  'Trophy',
  'Medal',
  'MedalStar',
  'MedalStars',
  'Flame',
  'Fire',
  'Heart',
  'HeartPulse',
  'Cup',
  'CupHot',
  'CupTrophy',
  'CupStar',
  'Mug',
  'TeaCup',
  'Bean',
  'Leaf',
  'Plant',
  'Trees',
  'Sun',
  'Sunrise',
  'Sunset',
  'Moon',
  'MoonStars',
  'Sparkle',
  'Sparkles',
  'GemSparkle',
  'MagicStar',
  'MagicWand',
  'WandSparkle',
  'Award',
  'AwardCertificate',
  'Crown',
  'CrownStar',
  'Diamond',
  'Gemini',
  'Target',
  'Bullseye',
  'Check',
  'CheckCircle',
  'TickCircle',
  'TickSquare',
  'Zap',
  'Bolt',
  'Lightning',
  'Flash',
  'Flashlight',
  'Rocket',
  'Rocket2',
  'Airplane',
  'AirplaneSquare',
  'ThumbsUp',
  'ThumbsDown',
  'Like',
  'Dislike',
  'LikeShapes',
  'LikeTag',
  'Smileys',
  'EmojiHappy',
  'StarShine',
  'StarRainbow',
  'StarFall',
  'GraduationCap',
  'Book',
  'BookOpen',
  'Bookmark',
  'Certificate',
  'Diploma',
  'Fire',
  'Flame',
  'Bonfire',
  'HotDrink',
  'Bezier',
  'Bolt',
  'Lightning',
  'Zap',
  'Crown',
  'CrownStar',
  'Diamond',
  'Gemini',
  'Gift',
  'GiftCard',
  'Present',
  'Discount',
  'DiscountCircle',
  'DiscountShape',
  'Money',
  'Dollar',
  'DollarCircle',
  'Coin',
  'Coins',
  'Wallet',
  'WalletMoney',
  'Bag',
  'BagShopping',
  'BagTick',
  'Cart',
  'ShoppingCart',
  'Shop',
  'Package',
  'Box',
  'Delivery',
  'Truck',
  'Ship',
  'Map',
  'MapPin',
  'Location',
  'Compass',
  'Globe',
  'Global',
  'User',
  'Users',
  'Profile',
  'ProfileAdd',
  'ProfileCircle',
  'ProfileTick',
  'Lock',
  'Unlock',
  'Shield',
  'ShieldTick',
  'ShieldStar',
  'Security',
  'Settings',
  'Sliders',
  'Slider',
  'Gear',
  'Setting',
  'Calendar',
  'CalendarTick',
  'Clock',
  'Timer',
  'Stopwatch',
  'Alarm',
  'Image',
  'Gallery',
  'Camera',
  'Video',
  'Music',
  'MusicNote',
  'MusicPlay',
  'Edit',
  'Pen',
  'PenTool',
  'Write',
  'Trash',
  'Delete',
  'Search',
  'SearchNormal',
  'Zoom',
  'Eye',
  'EyeOff',
  'EyeScan',
  'Notification',
  'Bell',
  'BellRing',
  'Message',
  'Chat',
  'ChatDots',
  'Link',
  'Link2',
  'Share',
  'Send',
  'Upload',
  'Download',
  'Save',
  'Heart',
  'HeartBroken',
  'HeartPulse',
  'HeartShine',
  'Star',
  'StarCircle',
  'StarSquare',
  'StarSlash',
  'StarOff',
  'Cloud',
  'CloudSun',
  'CloudRain',
  'CloudLightning',
  'CloudSnow',
  'Sun',
  'Sunrise',
  'Sunset',
  'Moon',
  'MoonCloud',
  'MoonFog',
  'Tree',
  'Plant',
  'Leaf',
  'Nature',
  'Flower',
  'Boat',
  'Mountain',
  'Tennis',
  'Basketball',
  'Football',
  'Volleyball',
  'Running',
  'Bicycle',
  'Pizza',
  'Cake',
  'Cookie',
  'Candy',
  'WineGlass',
  'Glass',
  'Home',
  'Building',
  'Bank',
  'Shop',
  'Store',
  'Flag',
  'FlagBanner',
  'Flag2',
  'Country',
  'Brush',
  'Paint',
  'Palette',
  'Eraser',
  'Pen',
  'Gamepad',
  'Controller',
  'Headphone',
  'Speaker',
  'Radio',
  'Device',
  'Mobile',
  'Monitor',
  'Laptop',
  'Tablet',
  'Watch',
  'Health',
  'Medical',
  'Hospital',
  'Pill',
  'Pills',
  'Bandage',
  'Activity',
  'Graph',
  'Chart',
  'ChartBar',
  'ChartLine',
  'ChartPie',
  'TrendUp',
  'TrendDown',
  'GraphUp',
  'GraphDown',
  'Battery',
  'BatteryFull',
  'BatteryCharge',
  'Wifi',
  'Signal',
  'Cube',
  'Box',
  'Package',
  'Archive',
  'Layer',
  'Layers',
  'List',
  'Grid',
  'Menu',
  'More',
  'MoreCircle',
  'MoreSquare',
  'Plus',
  'Minus',
  'Close',
  'X',
  'XCircle',
  'XSquare',
  'Check',
  'CheckCircle',
  'CheckSquare',
  'CheckList',
];

// Group icons by category for display
const GROUPED_ICONS = [
  {
    label: 'Favorites',
    icons: [
      'Coffee',
      'Star',
      'Trophy',
      'Medal',
      'Heart',
      'Flame',
      'Target',
      'Zap',
      'Crown',
      'Gift',
    ],
  },
  {
    label: 'Coffee & Drinks',
    icons: [
      'Coffee',
      'Cup',
      'CupHot',
      'Mug',
      'TeaCup',
      'Bean',
      'Leaf',
      'HotDrink',
      'CupTrophy',
      'CupStar',
      'Bonfire',
    ],
  },
  {
    label: 'Achievements',
    icons: [
      'Trophy',
      'Medal',
      'Award',
      'Crown',
      'Star',
      'Diamond',
      'BadgeDollar',
      'Certificate',
      'Diploma',
      'GraduationCap',
    ],
  },
  {
    label: 'Actions',
    icons: [
      'Check',
      'Like',
      'ThumbsUp',
      'Heart',
      'Sparkle',
      'Rocket',
      'Flag',
      'Target',
      'Zap',
      'Flash',
    ],
  },
  {
    label: 'Nature',
    icons: ['Sun', 'Sunrise', 'Sunset', 'Moon', 'Cloud', 'Star', 'Leaf', 'Tree', 'Flame', 'Fire'],
  },
  {
    label: 'Items',
    icons: ['Gift', 'Box', 'Bag', 'Cart', 'Cup', 'Book', 'Key', 'Lock', 'Shield', 'Wallet'],
  },
  {
    label: 'Tools',
    icons: [
      'Pen',
      'Edit',
      'Gear',
      'Search',
      'Camera',
      'Image',
      'Music',
      'Bell',
      'Clock',
      'Calendar',
    ],
  },
  {
    label: 'More',
    icons: ICON_LIST.filter(
      (n) =>
        ![
          'Coffee',
          'Star',
          'Trophy',
          'Medal',
          'Heart',
          'Flame',
          'Target',
          'Zap',
          'Crown',
          'Gift',
          'Cup',
          'CupHot',
          'Mug',
          'TeaCup',
          'Bean',
          'Leaf',
          'HotDrink',
          'CupTrophy',
          'CupStar',
          'Bonfire',
          'Trophy',
          'Medal',
          'Award',
          'Crown',
          'Star',
          'Diamond',
          'BadgeDollar',
          'Certificate',
          'Diploma',
          'GraduationCap',
          'Check',
          'Like',
          'ThumbsUp',
          'Heart',
          'Sparkle',
          'Rocket',
          'Flag',
          'Target',
          'Zap',
          'Flash',
          'Sun',
          'Sunrise',
          'Sunset',
          'Moon',
          'Cloud',
          'Star',
          'Leaf',
          'Tree',
          'Flame',
          'Fire',
          'Gift',
          'Box',
          'Bag',
          'Cart',
          'Cup',
          'Book',
          'Key',
          'Lock',
          'Shield',
          'Wallet',
          'Pen',
          'Edit',
          'Gear',
          'Search',
          'Camera',
          'Image',
          'Music',
          'Bell',
          'Clock',
          'Calendar',
        ].includes(n),
    ),
  },
];

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
}

// Lazy-load icon preview component
function IconPreview({ name, size = 24 }: { name: string; size?: number }) {
  const IconComp = useMemo(() => {
    try {
      // Dynamic require — Vite will tree-shake
      const mod = require('reicon-react') as Record<
        string,
        React.FC<{ size?: number; className?: string }>
      >;
      return mod[name] as React.FC<{ size?: number; className?: string }> | undefined;
    } catch {
      return undefined;
    }
  }, [name]);

  if (!IconComp) {
    // Fallback: show text placeholder
    return <span className="text-xs text-coffee-400 dark:text-coffee-500">{name.slice(0, 3)}</span>;
  }

  return <IconComp size={size} />;
}

export default function IconPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentIcon,
}: IconPickerModalProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Favorites');

  const filteredIcons = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return null; // use categories

    return ICON_LIST.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = useCallback(
    (name: string) => {
      onSelect(name);
      onClose();
    },
    [onSelect, onClose],
  );

  const displayIcons =
    filteredIcons ??
    GROUPED_ICONS.find((g) => g.label === activeCategory)?.icons ??
    GROUPED_ICONS[0].icons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coffee-200 dark:border-coffee-700">
          <h2 className="text-lg font-bold text-coffee-900 dark:text-cream">Seleccionar icono</h2>
          <button
            onClick={onClose}
            className="p-1 text-coffee-500 hover:text-coffee-700 dark:hover:text-cream transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-coffee-200 dark:border-coffee-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar icono…"
            className="w-full px-3 py-2 bg-coffee-50 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-600 text-coffee-900 dark:text-cream placeholder-coffee-400 focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
            autoFocus
          />
        </div>

        {/* Category tabs (when not searching) */}
        {!search && (
          <div className="flex gap-1 p-2 overflow-x-auto border-b border-coffee-200 dark:border-coffee-700">
            {GROUPED_ICONS.map((g) => (
              <button
                key={g.label}
                onClick={() => setActiveCategory(g.label)}
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === g.label
                    ? 'bg-gold-500 text-cream'
                    : 'bg-coffee-100 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-300 hover:bg-coffee-200 dark:hover:bg-coffee-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Icon grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {search && filteredIcons && filteredIcons.length === 0 ? (
            <p className="text-center text-coffee-400 dark:text-coffee-500 py-8">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {displayIcons.map((name) => {
                const isSelected = currentIcon === name;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    title={name}
                    className={`p-2 flex items-center justify-center aspect-square rounded transition-all border ${
                      isSelected
                        ? 'bg-gold-100 dark:bg-gold-500/20 border-gold-500 text-gold-600 dark:text-gold-400'
                        : 'bg-coffee-50 dark:bg-coffee-800 border-transparent hover:bg-coffee-100 dark:hover:bg-coffee-700 text-coffee-700 dark:text-coffee-200'
                    }`}
                  >
                    <IconPreview name={name} size={20} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with current selection */}
        <div className="p-3 border-t border-coffee-200 dark:border-coffee-700 flex items-center justify-between text-sm text-coffee-500 dark:text-coffee-400">
          <span>
            {displayIcons.length} icono{displayIcons.length !== 1 ? 's' : ''}
          </span>
          {currentIcon && (
            <span className="flex items-center gap-2">
              Actual:{' '}
              <code className="px-2 py-0.5 bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-200 text-xs">
                {currentIcon}
              </code>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

interface RankBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  avatarUrl?: string;
  frameType?: 'badge' | 'avatar';
  name?: string;
}

function getRankData(level: number): { emoji: string; title: string; color: string } {
  if (level <= 2) return { emoji: '👨‍🎓', title: 'Aprendiz', color: 'from-blue-400 to-blue-600' };
  if (level <= 5) return { emoji: '☕', title: 'Barista', color: 'from-amber-400 to-amber-600' };
  if (level <= 10)
    return { emoji: '🔥', title: 'Maestro Tostador', color: 'from-orange-400 to-orange-600' };
  if (level <= 15)
    return { emoji: '👃', title: 'Catador Experto', color: 'from-purple-400 to-purple-600' };
  if (level <= 20)
    return { emoji: '🎯', title: 'Maestro del Café', color: 'from-red-400 to-red-600' };
  return { emoji: '⭐', title: 'Leyenda Viva', color: 'from-yellow-300 to-yellow-500' };
}

function getFrameClasses(level: number): string {
  if (level <= 5) return 'border-2 border-gold-500';
  if (level <= 10) return 'border-4 border-gold-500 shadow-lg shadow-gold-500/20';
  if (level <= 15) return 'border-4 border-gold-400 ring-2 ring-gold-500/30';
  if (level <= 20) return 'border-4 border-gold-400 animate-pulse shadow-xl shadow-gold-500/30';
  return 'border-4 border-gold-300 animate-pulse ring-4 ring-gold-400/30';
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RankBadge({
  level,
  size = 'md',
  showLabel = false,
  avatarUrl,
  frameType = 'badge',
  name,
}: RankBadgeProps) {
  const { emoji, title, color } = getRankData(level);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-14 h-14 text-4xl',
  };

  const frameSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (frameType === 'avatar') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={`${frameSizes[size]} ${getFrameClasses(level)} rounded-full overflow-hidden flex items-center justify-center bg-coffee-800`}
          title={title}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-cream">{getInitials(name)}</span>
          )}
        </div>
        {showLabel && (
          <p className="text-xs font-semibold text-coffee-600 dark:text-coffee-300">{title}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-md`}
        title={title}
      >
        {emoji}
      </div>
      {showLabel && (
        <p className="text-xs font-semibold text-coffee-600 dark:text-coffee-300">{title}</p>
      )}
    </div>
  );
}

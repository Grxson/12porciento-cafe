import React from 'react';

interface RankBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getRankData(level: number): { emoji: string; title: string; color: string } {
  if (level <= 2) return { emoji: '👨‍🎓', title: 'Aprendiz', color: 'from-blue-400 to-blue-600' };
  if (level <= 5) return { emoji: '☕', title: 'Barista', color: 'from-amber-400 to-amber-600' };
  if (level <= 10) return { emoji: '🔥', title: 'Maestro Tostador', color: 'from-orange-400 to-orange-600' };
  if (level <= 15) return { emoji: '👃', title: 'Catador Experto', color: 'from-purple-400 to-purple-600' };
  if (level <= 20) return { emoji: '🎯', title: 'Maestro del Café', color: 'from-red-400 to-red-600' };
  return { emoji: '⭐', title: 'Leyenda Viva', color: 'from-yellow-300 to-yellow-500' };
}

export default function RankBadge({ level, size = 'md', showLabel = false }: RankBadgeProps) {
  const { emoji, title, color } = getRankData(level);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-14 h-14 text-4xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-md`}
        title={title}
      >
        {emoji}
      </div>
      {showLabel && <p className="text-xs font-semibold text-coffee-600 dark:text-coffee-300">{title}</p>}
    </div>
  );
}

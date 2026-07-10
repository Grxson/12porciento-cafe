import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { baristaApi } from '../api';

interface BrewLikeButtonProps {
  brewId: string;
  initialLiked: boolean;
  initialCount: number;
  onToggle?: (liked: boolean, count: number) => void;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: { text: 'text-xs', gap: 'gap-1', icon: 'w-3.5 h-3.5' },
  md: { text: 'text-sm', gap: 'gap-1.5', icon: 'w-4 h-4' },
};

export default function BrewLikeButton({
  brewId,
  initialLiked,
  initialCount,
  onToggle,
  size = 'md',
}: BrewLikeButtonProps) {
  const user = useUser((s) => s.user);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : prevCount - 1;

    // Optimistic
    setLiked(nextLiked);
    setCount(nextCount);

    try {
      if (prevLiked) {
        await baristaApi.unlikeBrew(brewId);
      } else {
        await baristaApi.likeBrew(brewId);
      }
      onToggle?.(nextLiked, nextCount);
    } catch {
      // Revert
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  }, [brewId, liked, count, loading, onToggle]);

  const sz = sizeStyles[size];

  // Not logged in — read-only
  if (!user) {
    return (
      <span
        className={`inline-flex items-center ${sz.gap} ${sz.text} text-gray-400 dark:text-gray-500`}
        aria-label={`${count} likes`}
      >
        <Heart className={`${sz.icon} text-gray-400 dark:text-gray-500`} aria-hidden="true" />
        {count > 0 && <span>{count}</span>}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-flex items-center ${sz.gap} ${sz.text} font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-coffee-900 rounded-md px-1 py-0.5 ${
        liked
          ? 'text-red-500 dark:text-red-400'
          : 'text-gray-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-400'
      } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={liked ? `Unlike (${count} likes)` : `Like (${count} likes)`}
      aria-pressed={liked}
    >
      {loading ? (
        <Loader2 className={`${sz.icon} animate-spin`} aria-hidden="true" />
      ) : (
        <motion.span
          key={liked ? 'filled' : 'outlined'}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <Heart className={sz.icon} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
        </motion.span>
      )}
      {count > 0 && <span>{count}</span>}
    </motion.button>
  );
}

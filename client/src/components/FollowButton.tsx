import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { baristaApi } from '../api';

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  size?: 'sm' | 'md' | 'lg';
  onToggle?: (isFollowing: boolean) => void;
}

const sizeStyles = {
  sm: { button: 'px-3 py-2.5 text-xs gap-1 min-h-11', icon: 'w-3.5 h-3.5' },
  md: { button: 'px-4 py-1.5 text-sm gap-1.5 min-h-11', icon: 'w-4 h-4' },
  lg: { button: 'px-5 py-2 text-base gap-2 min-h-11', icon: 'w-5 h-5' },
};

export default function FollowButton({
  targetUserId,
  targetUserName,
  size = 'md',
  onToggle,
}: FollowButtonProps) {
  const user = useUser((s) => s.user);

  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoverDejar, setHoverDejar] = useState(false);

  // Check initial follow status
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setLoading(true);
      try {
        const res = await baristaApi.getFollowStatus([targetUserId]);
        const statusMap = res.data ?? {};
        if (!cancelled) setIsFollowing(!!statusMap[targetUserId]);
      } catch (err) {
        console.error('follow status check failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const handleToggle = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);

    const prev = isFollowing;
    // Optimistic toggle
    setIsFollowing((f) => !f);

    try {
      if (prev) {
        await baristaApi.unfollowUser(targetUserId);
      } else {
        await baristaApi.followUser(targetUserId);
      }
      onToggle?.(!prev);
    } catch (err) {
      console.error('follow action failed:', err);
      // Revert optimistic
      setIsFollowing(prev);
    } finally {
      setActionLoading(false);
    }
  }, [targetUserId, isFollowing, actionLoading, onToggle]);

  // Self-follow guard — after hooks to keep rule-of-hooks happy
  if (!user || user.id === targetUserId) return null;

  const sz = sizeStyles[size];
  const isLoading = loading || actionLoading;

  // Skeleton while loading initial status
  if (loading) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border border-coffee-200 dark:border-coffee-700 bg-coffee-100 dark:bg-coffee-800 ${sz.button}`}
        aria-hidden="true"
      >
        <span className="w-14 h-3 shimmer dark:shimmer-dark rounded" />
      </span>
    );
  }

  const notFollowingClasses =
    'bg-coffee-700 hover:bg-coffee-800 text-white border border-transparent dark:bg-coffee-600 dark:hover:bg-coffee-500';

  const followingClasses = `border-coffee-300 dark:border-coffee-600 text-coffee-700 dark:text-coffee-300 bg-transparent ${
    hoverDejar
      ? 'border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      : ''
  }`;

  return (
    <motion.button
      onClick={handleToggle}
      disabled={isLoading}
      onMouseEnter={() => isFollowing && setHoverDejar(true)}
      onMouseLeave={() => isFollowing && setHoverDejar(false)}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-flex items-center rounded-full font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-coffee-900 ${
        isFollowing ? followingClasses : notFollowingClasses
      } ${sz.button} ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={
        isFollowing
          ? hoverDejar
            ? `Dejar de seguir a ${targetUserName}`
            : `Siguiendo a ${targetUserName}`
          : `Seguir a ${targetUserName}`
      }
    >
      {isLoading ? (
        <Loader2 className={`animate-spin ${sz.icon}`} aria-hidden="true" />
      ) : isFollowing ? (
        hoverDejar ? (
          <UserMinus className={sz.icon} aria-hidden="true" />
        ) : (
          <UserPlus className={sz.icon} aria-hidden="true" />
        )
      ) : (
        <UserPlus className={sz.icon} aria-hidden="true" />
      )}

      {isLoading ? (
        <span>Seguir</span>
      ) : isFollowing ? (
        <span>{hoverDejar ? 'Dejar de seguir' : 'Siguiendo'}</span>
      ) : (
        <span>Seguir</span>
      )}
    </motion.button>
  );
}

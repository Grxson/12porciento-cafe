import { motion } from 'framer-motion';
import { Gift, Zap, Percent, Package } from 'lucide-react';
import ReiconIcon from './ReiconIcon';

interface RewardCardProps {
  reward: {
    id: string;
    name: string;
    description: string;
    icon: string;
    xpCost: number;
    discountPct: number;
    maxUses: number;
    isActive: boolean;
    stock?: number | null;
    isClaimed?: boolean;
  };
  userXp: number;
  isClaimed: boolean;
  onClaim: (id: string) => void;
}

export default function RewardCard({ reward, userXp, isClaimed, onClaim }: RewardCardProps) {
  const canClaim =
    !isClaimed &&
    userXp >= reward.xpCost &&
    reward.isActive &&
    ((reward.stock ?? null) === null || (reward.stock ?? 0) > 0);
  const progressPct = Math.min((userXp / reward.xpCost) * 100, 100);
  const hasStock = (reward.stock ?? null) === null || (reward.stock ?? 0) > 0;
  const stockLabel = (reward.stock ?? null) === null ? 'Ilimitado' : `${reward.stock} restantes`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden"
    >
      {/* Claimed badge */}
      {isClaimed && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          Canjeado ✓
        </div>
      )}

      {/* Icon */}
      <ReiconIcon icon={reward.icon} size={36} className="block mx-auto" />

      {/* Name */}
      <h3 className="font-serif text-lg text-coffee-900 dark:text-cream leading-tight">
        {reward.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-coffee-600 dark:text-coffee-400 leading-relaxed line-clamp-2">
        {reward.description}
      </p>

      {/* Discount badge */}
      {reward.discountPct > 0 && (
        <div className="flex items-center gap-1 text-gold-600 dark:text-gold-400 text-xs font-semibold">
          <Percent className="w-3 h-3" />
          {reward.discountPct}% de descuento
        </div>
      )}

      {/* Stock info */}
      {reward.stock !== null && (
        <div className="flex items-center gap-1 text-coffee-500 dark:text-coffee-400 text-xs">
          <Package className="w-3 h-3" />
          {stockLabel}
        </div>
      )}

      {/* XP cost bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-coffee-600 dark:text-coffee-400">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {reward.xpCost} XP
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="w-full h-1.5 bg-coffee-200 dark:bg-coffee-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${progressPct >= 100 ? 'bg-green-500' : 'bg-gold-500'}`}
          />
        </div>
      </div>

      {/* Claim button */}
      <button
        onClick={() => onClaim(reward.id)}
        disabled={!canClaim}
        className={`w-full mt-auto py-2 px-4 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
          isClaimed
            ? 'bg-coffee-100 dark:bg-coffee-800 text-coffee-400 cursor-not-allowed'
            : !canClaim
              ? 'bg-coffee-100 dark:bg-coffee-800 text-coffee-400 cursor-not-allowed'
              : 'bg-gold-500 hover:bg-gold-400 text-coffee-950 shadow-sm hover:shadow-md active:scale-[0.98]'
        }`}
      >
        {isClaimed ? (
          <>Canjeado</>
        ) : !hasStock ? (
          <>Agotado</>
        ) : userXp < reward.xpCost ? (
          <>
            <Zap className="w-3.5 h-3.5" />
            Faltan {reward.xpCost - userXp} XP
          </>
        ) : (
          <>
            <Gift className="w-3.5 h-3.5" />
            Canjear
          </>
        )}
      </button>
    </motion.div>
  );
}

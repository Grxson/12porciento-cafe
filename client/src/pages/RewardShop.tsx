import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gift, RotateCw, Zap, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';
import { baristaApi } from '../api/barista';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { PageMeta } from '../hooks/usePageMeta';
import RewardCard from '../components/RewardCard';

interface Reward {
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
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 rounded-lg space-y-3"
        >
          <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full" />
          <div className="shimmer dark:shimmer-dark h-5 w-3/4" />
          <div className="shimmer dark:shimmer-dark h-3 w-full" />
          <div className="shimmer dark:shimmer-dark h-3 w-2/3" />
          <div className="shimmer dark:shimmer-dark h-1.5 w-full rounded-full" />
          <div className="shimmer dark:shimmer-dark h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function RewardShop() {
  const queryClient = useQueryClient();
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);

  const {
    data: rewardsResp,
    isLoading: rewardsLoading,
    isError: rewardsError,
    refetch: refetchRewards,
  } = useQuery({
    queryKey: ['barista-rewards'],
    queryFn: () => baristaApi.getRewards().then((r) => r.data as Reward[]),
  });

  const { data: profileResp, isLoading: profileLoading } = useQuery({
    queryKey: ['barista-profile', user?.id],
    queryFn: () => (user ? baristaApi.getProfile(user.id).then((r) => r.data.data) : null),
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => baristaApi.claimReward(id),
    onSuccess: (res) => {
      const code = res.data?.code;
      addToast(
        code ? `¡Recompensa canjeada! Código: ${code}` : 'Recompensa canjeada exitosamente',
        'success',
      );
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c8a45c', '#4a3728', '#f5e6d3'],
      });
      queryClient.invalidateQueries({ queryKey: ['barista-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['barista-profile'] });
    },
    onError: () => {
      addToast('Error al canjear recompensa', 'error');
    },
  });

  const rewards: Reward[] = Array.isArray(rewardsResp) ? rewardsResp : [];
  const userXp = profileResp?.totalXp ?? 0;
  const isLoading = rewardsLoading || profileLoading;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta
        title="Tienda de Recompensas"
        description="Canjea tus puntos XP por descuentos y recompensas en 12% Café."
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Barista</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2 flex items-center justify-center gap-3">
            <Gift className="w-7 h-7 text-gold-500" />
            Tienda de Recompensas
          </h1>
          {!isLoading && (
            <div className="flex items-center justify-center gap-2 text-coffee-600 dark:text-coffee-400 text-sm mt-3">
              <Zap className="w-4 h-4 text-gold-500" />
              <span>
                Tienes <strong className="text-coffee-900 dark:text-cream">{userXp} XP</strong>{' '}
                disponibles
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonGrid />
        ) : rewardsError ? (
          <div className="text-center py-16">
            <Coffee className="w-12 h-12 text-coffee-500 dark:text-coffee-400 mx-auto mb-4" />
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">
              No se pudieron cargar las recompensas.
            </p>
            <button
              onClick={() => refetchRewards()}
              className="inline-flex items-center gap-2 text-xs text-gold-500 hover:text-gold-400 underline transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-coffee-500 dark:text-coffee-400 mx-auto mb-4" />
            <p className="text-coffee-600 dark:text-coffee-400 text-sm">
              No hay recompensas disponibles
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {rewards.map((reward, idx) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <RewardCard
                  reward={reward}
                  userXp={userXp}
                  isClaimed={reward.isClaimed ?? false}
                  onClaim={(id) => claimMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

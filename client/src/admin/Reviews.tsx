import { useEffect, useState } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import { reviewsApi } from '../api';
import StarRating from '../components/StarRating';
import type { Review } from '../types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  const load = () => {
    reviewsApi.adminList().then((r) => { setReviews(r.data.data); setLoading(false); });
  };

  useEffect(load, []);

  const approve = async (id: string) => {
    await reviewsApi.approve(id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta reseña?')) return;
    await reviewsApi.delete(id);
    load();
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  const pending = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Reseñas</h1>
          <p className="text-coffee-400 text-sm mt-1">
            {pending > 0 && <span className="text-yellow-400">{pending} pendientes · </span>}
            {reviews.length} total
          </p>
        </div>

        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 border transition-all ${
                filter === f ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-700 text-coffee-400 hover:border-coffee-500'
              }`}
            >
              {{ all: 'Todas', pending: 'Pendientes', approved: 'Aprobadas' }[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay reseñas en esta categoría.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className={`bg-coffee-900 border p-5 ${review.isApproved ? 'border-coffee-800' : 'border-yellow-500/30'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating value={review.rating} size={14} readonly />
                    <span className="text-cream font-medium text-sm">{review.name}</span>
                    <span className="text-coffee-500 text-xs">{review.email}</span>
                    {!review.isApproved && (
                      <span className="bg-yellow-900/40 text-yellow-400 text-[10px] px-2 py-0.5 uppercase tracking-widest">Pendiente</span>
                    )}
                  </div>
                  <p className="text-coffee-300 text-sm mb-2">{review.comment}</p>
                  <div className="flex items-center gap-3 text-xs text-coffee-500">
                    <span>{new Date(review.createdAt).toLocaleDateString('es-MX')}</span>
                    {review.product && (
                      <span>· <span className="text-coffee-400">{review.product.name}</span></span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {!review.isApproved && (
                    <button
                      onClick={() => approve(review.id)}
                      title="Aprobar"
                      className="text-green-400 hover:text-green-300 transition-colors p-1"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(review.id)}
                    title="Eliminar"
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

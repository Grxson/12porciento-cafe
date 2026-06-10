import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { usersApi } from '../../api';
import type { Review } from '../../types';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.myReviews().then((r) => { setReviews(r.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16">
        <Star className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400 mb-4">Aún no has escrito reseñas.</p>
        <Link to="/tienda" className="btn-primary">Explorar cafés</Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {reviews.map((review, i) => (
        <motion.div key={review.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }} className="bg-coffee-900 border border-coffee-800 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              {review.product && (
                <Link to={`/tienda/${review.product.slug}`}
                  className="text-gold-500 hover:text-gold-400 text-sm font-medium transition-colors">
                  {review.product.name}
                </Link>
              )}
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j}
                    className={`w-3.5 h-3.5 ${j < review.rating ? 'fill-gold-500 text-gold-500' : 'text-coffee-700'}`} />
                ))}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 ${review.isApproved ? 'bg-green-900/30 text-green-400' : 'bg-coffee-800 text-coffee-500'}`}>
              {review.isApproved ? 'Publicada' : 'En revisión'}
            </span>
          </div>
          <p className="text-coffee-300 text-sm leading-relaxed">"{review.comment}"</p>
          <p className="text-coffee-500 text-xs mt-3">
            {new Date(review.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

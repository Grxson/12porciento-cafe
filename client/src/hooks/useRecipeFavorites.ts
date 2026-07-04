import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeFavoritesApi } from '../api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

export function useRecipeFavorites() {
  const user = useUser((s) => s.user);
  const { add } = useToast();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const favoriteIdsRef = useRef(favoriteIds);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    recipeFavoritesApi
      .list()
      .then((r) => setFavoriteIds(new Set(r.data.data.map((f) => f.recipeId))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const toggle = useCallback(
    async (recipeId: string) => {
      if (!user) {
        add('Inicia sesión para guardar favoritos', 'info');
        return;
      }
      const isFav = favoriteIdsRef.current.has(recipeId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });
      try {
        if (isFav) {
          await recipeFavoritesApi.remove(recipeId);
        } else {
          await recipeFavoritesApi.add(recipeId);
        }
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(recipeId);
          else next.delete(recipeId);
          return next;
        });
      }
    },
    [user?.id, add],
  );

  const isFavorite = useCallback((recipeId: string) => favoriteIdsRef.current.has(recipeId), []);

  return { favoriteIds, loading, toggle, isFavorite };
}

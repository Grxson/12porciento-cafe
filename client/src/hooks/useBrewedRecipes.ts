import { useState, useEffect, useCallback } from 'react';
import { baristaApi } from '../api/barista';
import { useUser } from '../context/UserContext';

export function useBrewedRecipes() {
  const user = useUser((s) => s.user);
  const [brewedIds, setBrewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setBrewedIds(new Set());
      return;
    }
    setLoading(true);
    baristaApi
      .getBrewedRecipeIds()
      .then((res) => setBrewedIds(new Set(res.data.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const hasBrewed = useCallback((recipeId: string) => brewedIds.has(recipeId), [brewedIds]);

  return { hasBrewed, loading };
}

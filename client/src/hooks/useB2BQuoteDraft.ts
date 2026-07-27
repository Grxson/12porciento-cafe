import { useCallback, useEffect, useState } from 'react';
import type { B2BFrequency, B2BProduct, B2BQuoteDraft, B2BQuoteDraftItem } from '../types';
import {
  B2B_DRAFT_KEY,
  createEmptyB2BDraft,
  parseStoredB2BDraft,
  selectB2BTier,
} from '../lib/b2b-quote';

const loadDraft = (): B2BQuoteDraft => {
  if (typeof window === 'undefined') return createEmptyB2BDraft();
  return parseStoredB2BDraft(window.localStorage.getItem(B2B_DRAFT_KEY)) ?? createEmptyB2BDraft();
};

export function useB2BQuoteDraft() {
  const [draft, setDraft] = useState<B2BQuoteDraft>(loadDraft);

  useEffect(() => {
    window.localStorage.setItem(
      B2B_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
  }, [draft]);

  const upsertItem = useCallback((item: B2BQuoteDraftItem) => {
    setDraft((current) => {
      const exists = current.items.some((entry) => entry.productId === item.productId);
      return {
        ...current,
        items: exists
          ? current.items.map((entry) => (entry.productId === item.productId ? item : entry))
          : [...current.items, item],
      };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.productId !== productId),
    }));
  }, []);

  const setBusinessType = useCallback((businessType: string) => {
    setDraft((current) => ({ ...current, businessType }));
  }, []);

  const setFrequency = useCallback((frequency: B2BFrequency) => {
    setDraft((current) => ({
      ...current,
      frequency,
      items: current.items.map((item) => ({ ...item, frequency })),
    }));
  }, []);

  const reconcileItems = useCallback((products: B2BProduct[]) => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    setDraft((current) => {
      const items = current.items.filter((item) => {
        const product = productMap.get(item.productId);
        return Boolean(product && selectB2BTier(product.b2bPriceTiers, item.quantity));
      });
      if (items.length === current.items.length) return current;
      return { ...current, items };
    });
  }, []);

  const reset = useCallback(() => {
    const empty = createEmptyB2BDraft();
    setDraft(empty);
    window.localStorage.removeItem(B2B_DRAFT_KEY);
  }, []);

  return {
    draft,
    upsertItem,
    removeItem,
    setBusinessType,
    setFrequency,
    reconcileItems,
    reset,
  };
}

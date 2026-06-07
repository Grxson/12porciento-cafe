import { useState, useCallback } from 'react';

export interface RecipeFormData {
  title: string;
  slug: string;
  description: string;
  method: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime: string;
  yield: string;
  temp: string;
  grind: string;
  ratio: string;
  isPremium: boolean;
  isPublished: boolean;
  productId: string;
}

const EMPTY_FORM: RecipeFormData = {
  title: '',
  slug: '',
  description: '',
  method: 'V60',
  difficulty: 'MEDIA',
  prepTime: '',
  yield: '',
  temp: '',
  grind: '',
  ratio: '',
  isPremium: false,
  isPublished: false,
  productId: '',
};

export function useRecipeForm(initialData?: RecipeFormData) {
  const [form, setForm] = useState<RecipeFormData>(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof RecipeFormData, string>>>({});

  const updateField = useCallback((field: keyof RecipeFormData, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title if slug is empty
      if (field === 'title' && !prev.slug) {
        updated.slug = (value as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      return updated;
    });

    // Clear field error
    setErrors(prev => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof RecipeFormData, string>> = {};
    if (!form.title.trim()) newErrors.title = 'Título requerido';
    if (!form.slug.trim()) newErrors.slug = 'Slug requerido';
    if (!form.method.trim()) newErrors.method = 'Método requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  return {
    form,
    errors,
    updateField,
    setForm,
    validate,
    reset,
  };
}

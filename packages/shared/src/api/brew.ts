/**
 * 12% Brew — API client (axios)
 *
 * Wraps /api/brew/* endpoints. Mirrors the existing `baristaApi` style.
 */

import api from './index';
import type {
  BrewMethod,
  BrewRecipeStructured,
  BrewSession,
  DialInRecommendation,
  ScaledRecipe,
  WaterProfile,
  BrewSessionResult,
  BrewSessionStatus,
  PaginatedResponse,
} from '../types/brew';

export interface BrewRecipeFilters {
  method?: string;
  profile?: string;
  difficulty?: string;
  coffeeId?: string;
  recipeType?: string;
  featured?: string;
  search?: string;
  page?: string;
  pageSize?: string;
}

export interface BrewSessionFilters {
  coffeeId?: string;
  recipeId?: string;
  brewMethodId?: string;
  status?: BrewSessionStatus;
  minRating?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
}

export interface StartSessionPayload {
  coffeeId?: string;
  recipeId?: string;
  brewMethodId?: string;
  coffeeDoseGrams?: number;
  waterGrams?: number;
  ratio?: number;
  temperatureCelsius?: number;
  grindSetting?: string;
  grindMicrons?: number;
  equipmentSnapshot?: unknown;
}

export interface CompleteSessionPayload {
  rating?: number;
  notes?: string;
  result?: BrewSessionResult;
  sweetnessRating?: number;
  acidityRating?: number;
  bodyRating?: number;
  clarityRating?: number;
  brewTimeSeconds?: number;
}

export interface EquipmentPayload {
  name: string;
  brand?: string;
  category?: string;
  photoUrl?: string;
  isFavorite?: boolean;
}

export interface WaterProfilePayload {
  name: string;
  tds?: number;
  gh?: number;
  kh?: number;
  calcium?: number;
  magnesium?: number;
  sodium?: number;
  description?: string;
}

export const brewApi = {
  // ── Methods (public) ──
  listMethods: () => api.get<{ data: BrewMethod[] }>('/brew/methods'),
  getMethod: (slug: string) => api.get<{ data: BrewMethod }>(`/brew/methods/${slug}`),

  // ── Recipes (public) ──
  listRecipes: (filters?: BrewRecipeFilters) =>
    api.get<PaginatedResponse<BrewRecipeStructured>>('/brew/recipes', { params: filters }),
  getRecipe: (slug: string) => api.get<{ data: BrewRecipeStructured }>(`/brew/recipes/${slug}`),
  getRecipesForCoffee: (slug: string) =>
    api.get<{ coffee: unknown; data: BrewRecipeStructured[] }>(`/brew/coffees/${slug}/recipes`),

  // ── Engines (public) ──
  scaleRecipe: (recipeId: string, coffeeDoseGrams: number) =>
    api.post<{ data: ScaledRecipe }>(`/brew/recipes/${recipeId}/scale`, { coffeeDoseGrams }),
  dialIn: (
    recipeId: string,
    body: {
      result: BrewSessionResult;
      current?: {
        grindSetting?: string;
        temperatureCelsius?: number;
        coffeeDoseGrams?: number;
        waterGrams?: number;
        ratio?: number;
        brewTimeSeconds?: number;
        agitation?: 'low' | 'medium' | 'high';
      };
    },
  ) => api.post<{ data: DialInRecommendation }>(`/brew/recipes/${recipeId}/dial-in`, body),

  // ── Sessions (user) ──
  startSession: (payload: StartSessionPayload) =>
    api.post<{ data: BrewSession }>('/brew/sessions', payload),
  listSessions: (filters?: BrewSessionFilters) =>
    api.get<PaginatedResponse<BrewSession>>('/brew/sessions', { params: filters }),
  getSession: (id: string) => api.get<{ data: BrewSession }>(`/brew/sessions/${id}`),
  updateSession: (id: string, payload: Partial<StartSessionPayload> & { notes?: string; status?: BrewSessionStatus }) =>
    api.put<{ data: BrewSession }>(`/brew/sessions/${id}`, payload),
  completeSession: (id: string, payload: CompleteSessionPayload) =>
    api.post<{ data: BrewSession }>(`/brew/sessions/${id}/complete`, payload),
  deleteSession: (id: string) => api.delete(`/brew/sessions/${id}`),
  toggleFavorite: (id: string) =>
    api.post<{ data: { favorited: boolean } }>(`/brew/sessions/${id}/favorite`),
  unfavorite: (id: string) =>
    api.delete<{ data: { favorited: boolean } }>(`/brew/sessions/${id}/favorite`),

  // ── Equipment (user) ──
  listEquipment: () => api.get<{ data: unknown[] }>('/brew/equipment'),
  createEquipment: (payload: EquipmentPayload) =>
    api.post<{ data: unknown }>('/brew/equipment', payload),
  updateEquipment: (id: string, payload: Partial<EquipmentPayload>) =>
    api.put<{ data: unknown }>(`/brew/equipment/${id}`, payload),
  deleteEquipment: (id: string) => api.delete(`/brew/equipment/${id}`),

  // ── Water profiles ──
  listWaterProfiles: () => api.get<{ data: WaterProfile[] }>('/brew/water-profiles'),
  createWaterProfile: (payload: WaterProfilePayload) =>
    api.post<{ data: WaterProfile }>('/brew/water-profiles', payload),
  deleteWaterProfile: (id: string) => api.delete(`/brew/water-profiles/${id}`),
};

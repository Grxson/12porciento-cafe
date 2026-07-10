import api from './index';

export const baristaApi = {
  getProfile: (userId: string) => api.get(`/barista/${userId}/profile`),

  submitBrewLog: (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    photoUrl?: string;
    clientBrewId?: string;
    grindSize?: string;
    waterTemp?: number;
    brewTime?: number;
    coffeeWeight?: number;
    waterVolume?: number;
    beanId?: string;
    equipmentIds?: string[];
    tags?: string[];
  }) => api.post('/barista/brew-logs', data),

  getLeaderboard: (limit = 50, period = 'all-time') =>
    api.get('/barista/leaderboard', { params: { limit, period } }),

  getAchievements: () => api.get('/barista/achievements'),

  getUserBrews: (userId: string, params?: { recipeId?: string; limit?: string; page?: string }) =>
    api.get(`/barista/${userId}/brews`, { params }),

  getBrewedRecipeIds: () => api.get('/barista/me/brewed-ids'),

  getStats: (userId: string, params?: { month?: string }) =>
    api.get(`/barista/${userId}/stats`, { params }),

  // ── Fase 1: Identity ──

  updateProfile: (data: {
    bio?: string;
    bannerUrl?: string;
    activeTitleId?: string;
    flavorProfile?: { favorites: string[]; preferredOrigin: string; preferredRoast: string };
  }) => api.put('/barista/me/profile', data),

  listEquipment: () => api.get('/barista/me/equipment'),

  createEquipment: (data: {
    name: string;
    brand?: string;
    category: string;
    photoUrl?: string;
    isFavorite?: boolean;
  }) => api.post('/barista/me/equipment', data),

  updateEquipment: (
    id: string,
    data: {
      name?: string;
      brand?: string;
      category?: string;
      photoUrl?: string;
      isFavorite?: boolean;
    },
  ) => api.put(`/barista/me/equipment/${id}`, data),

  deleteEquipment: (id: string) => api.delete(`/barista/me/equipment/${id}`),

  getTitles: () => api.get('/barista/titles'),

  // ── Reward Shop ──

  getRewards: () => api.get('/barista/rewards'),
  claimReward: (id: string) => api.post(`/barista/rewards/${id}/claim`),
  getClaims: () => api.get('/barista/rewards/claims'),

  // ── Fase 2: Social ──

  followUser: (userId: string) => api.post(`/barista/follow/${userId}`),
  unfollowUser: (userId: string) => api.delete(`/barista/follow/${userId}`),
  getFollowers: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/barista/followers/${userId}`, { params }),
  getFollowing: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/barista/following/${userId}`, { params }),
  getFollowStatus: (userIds: string[]) =>
    api.get('/barista/follow/status', { params: { ids: userIds.join(',') } }),
  getFeed: (params?: { cursor?: string; limit?: number }) => api.get('/barista/feed', { params }),
  likeBrew: (brewId: string) => api.post(`/barista/brews/${brewId}/like`),
  unlikeBrew: (brewId: string) => api.delete(`/barista/brews/${brewId}/like`),
};

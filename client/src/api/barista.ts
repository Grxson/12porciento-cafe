import api from './index';

export const baristaApi = {
  getProfile: (userId: string) =>
    api.get(`/barista/${userId}/profile`),

  submitBrewLog: (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    photoUrl?: string;
  }) => api.post('/barista/brew-logs', data),

  getLeaderboard: (limit = 50) =>
    api.get('/barista/leaderboard', { params: { limit } }),
};

export interface StepDraft {
  index: number;
  rating?: number;   // 1-10, undefined = not rated
  notes?: string;    // combined from voice + templates + text
  completedAt?: string; // ISO timestamp when step was confirmed
}

export interface RecipeDraft {
  id: string;           // `${userId}:${recipeId}` as key
  recipeId: string;
  userId: string;
  startedAt: string;    // ISO timestamp
  currentStepIndex: number;
  steps: StepDraft[];
  status: 'in_progress' | 'completed';
}

// lib/types/recipe.ts
// Data models for cooking recipes and progress tracking

export interface Recipe {
  id: string;
  title: string;
  heroImageUrl?: string;
  servings: number;
  totalTimeMins: number;
  ingredients: Array<{
    id: string;
    label: string;
    qty?: string;
  }>;
  steps: Array<{
    id: string;
    title?: string;
    instruction: string; // allow basic HTML/markdown rendering
    durationSec?: number; // optional timer
    media?: {
      type: 'image' | 'video';
      url: string;
    };
    requiresConfirm?: boolean; // show "I did this" checkbox
    note?: string;
  }>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RecipeProgress {
  ingredientCheckedIds: string[];
  currentStepIndex: number; // -1 = still in Ingredients
  stepCompletion: Record<string, boolean>;
  timers: Record<string, {
    remainingSec: number;
    running: boolean;
    startedAt?: number; // for drift-corrected resume
  }>;
  updatedAt: number;
}

export interface TimerState {
  remainingSec: number;
  running: boolean;
  startedAt?: number;
}

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
}

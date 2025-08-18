// lib/usePersistedState.ts
// Utilities for localStorage hydration/sync with Firestore backup

'use client';

import { useEffect, useState, useCallback } from 'react';
import { RecipeProgress } from './types/recipe';

const STORAGE_PREFIX = 'recipe_progress_';

/**
 * Custom hook for persisting recipe progress to localStorage
 * with automatic hydration and debounced updates
 */
export function usePersistedProgress(recipeId: string) {
  const [progress, setProgress] = useState<RecipeProgress>({
    ingredientCheckedIds: [],
    currentStepIndex: -1,
    stepCompletion: {},
    timers: {},
    updatedAt: Date.now(),
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${recipeId}`);
      if (stored) {
        const parsedProgress = JSON.parse(stored) as RecipeProgress;
        setProgress(parsedProgress);
      }
    } catch (error) {
      console.warn('Failed to hydrate progress from localStorage:', error);
    } finally {
      setIsHydrated(true);
    }
  }, [recipeId]);

  // Debounced save to localStorage
  const saveToLocalStorage = useCallback((newProgress: RecipeProgress) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}${recipeId}`,
        JSON.stringify(newProgress)
      );
    } catch (error) {
      console.warn('Failed to save progress to localStorage:', error);
    }
  }, [recipeId]);

  // Update progress with automatic persistence
  const updateProgress = useCallback((updates: Partial<RecipeProgress>) => {
    const newProgress = {
      ...progress,
      ...updates,
      updatedAt: Date.now(),
    };
    setProgress(newProgress);
    saveToLocalStorage(newProgress);
  }, [progress, saveToLocalStorage]);

  // Reset progress
  const resetProgress = useCallback(() => {
    const initialProgress: RecipeProgress = {
      ingredientCheckedIds: [],
      currentStepIndex: -1,
      stepCompletion: {},
      timers: {},
      updatedAt: Date.now(),
    };
    setProgress(initialProgress);
    saveToLocalStorage(initialProgress);
  }, [saveToLocalStorage]);

  // Clear progress (for cleanup)
  const clearProgress = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${STORAGE_PREFIX}${recipeId}`);
  }, [recipeId]);

  return {
    progress,
    updateProgress,
    resetProgress,
    clearProgress,
    isHydrated,
  };
}

/**
 * Get all stored recipe progress keys
 */
export function getStoredRecipeIds(): string[] {
  if (typeof window === 'undefined') return [];

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

/**
 * Clear all recipe progress from localStorage
 */
export function clearAllProgress(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

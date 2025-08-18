// lib/progress.ts
// Progress calculation utilities for cooking steps

import { Recipe, RecipeProgress } from './types/recipe';

/**
 * Calculate overall cooking progress percentage
 * Ingredients phase contributes 30%, steps phase contributes 70%
 */
export function calculateProgress(recipe: Recipe, progress: RecipeProgress): number {
  if (!recipe.ingredients.length && !recipe.steps.length) {
    return 0;
  }

  // Ingredients phase: 30% of total progress
  const ingredientProgress = recipe.ingredients.length > 0 
    ? (progress.ingredientCheckedIds.length / recipe.ingredients.length) * 30
    : 0;

  // Steps phase: 70% of total progress
  const completedSteps = Object.values(progress.stepCompletion).filter(Boolean).length;
  const stepProgress = recipe.steps.length > 0
    ? (completedSteps / recipe.steps.length) * 70
    : 0;

  const totalProgress = ingredientProgress + stepProgress;
  return Math.min(100, Math.max(0, Math.round(totalProgress)));
}

/**
 * Check if all ingredients are marked as ready
 */
export function areAllIngredientsReady(recipe: Recipe, progress: RecipeProgress): boolean {
  if (!recipe.ingredients.length) return true;
  return recipe.ingredients.every(ingredient => 
    progress.ingredientCheckedIds.includes(ingredient.id)
  );
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(stepId: string, progress: RecipeProgress): boolean {
  return progress.stepCompletion[stepId] === true;
}

/**
 * Check if user can proceed to the next step
 */
export function canProceedToNextStep(
  recipe: Recipe, 
  progress: RecipeProgress, 
  currentStepIndex: number
): boolean {
  // Must complete ingredients first
  if (currentStepIndex === -1) {
    return areAllIngredientsReady(recipe, progress);
  }

  // Can't proceed past the last step
  if (currentStepIndex >= recipe.steps.length - 1) {
    return false;
  }

  // Must complete current step to proceed
  const currentStep = recipe.steps[currentStepIndex];
  return currentStep ? isStepCompleted(currentStep.id, progress) : false;
}

/**
 * Check if user can go back to previous step
 */
export function canGoToPreviousStep(currentStepIndex: number): boolean {
  return currentStepIndex > -1;
}

/**
 * Get the current step object
 */
export function getCurrentStep(recipe: Recipe, currentStepIndex: number) {
  if (currentStepIndex === -1 || currentStepIndex >= recipe.steps.length) {
    return null;
  }
  return recipe.steps[currentStepIndex];
}

/**
 * Get progress text for display (e.g., "Step 2 of 7")
 */
export function getProgressText(recipe: Recipe, currentStepIndex: number): string {
  if (currentStepIndex === -1) {
    return 'Ingredients';
  }
  
  if (currentStepIndex >= recipe.steps.length) {
    return 'Complete!';
  }

  return `Step ${currentStepIndex + 1} of ${recipe.steps.length}`;
}

/**
 * Check if the recipe is fully completed
 */
export function isRecipeCompleted(recipe: Recipe, progress: RecipeProgress): boolean {
  const allIngredientsReady = areAllIngredientsReady(recipe, progress);
  const allStepsComplete = recipe.steps.every(step => 
    isStepCompleted(step.id, progress)
  );
  
  return allIngredientsReady && allStepsComplete;
}

/**
 * Get next available step index
 */
export function getNextStepIndex(
  recipe: Recipe, 
  progress: RecipeProgress, 
  currentStepIndex: number
): number {
  // From ingredients to first step
  if (currentStepIndex === -1 && areAllIngredientsReady(recipe, progress)) {
    return 0;
  }

  // From current step to next step
  if (canProceedToNextStep(recipe, progress, currentStepIndex)) {
    return currentStepIndex + 1;
  }

  return currentStepIndex;
}

/**
 * Get previous step index
 */
export function getPreviousStepIndex(currentStepIndex: number): number {
  return Math.max(-1, currentStepIndex - 1);
}

/**
 * Format time duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format time for timer display (MM:SS or HH:MM:SS)
 */
export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// app/recipes/[recipeId]/cook/CookClient.tsx
// Main interactive cooking interface component

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, RecipeProgress } from '@/lib/types/recipe';
import { saveProgress } from '@/lib/firestore';
import { calculateProgress, isStepCompleted, formatDuration } from '@/lib/progress';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import FullProcess from './FullProcess';

interface CookClientProps {
  recipe: Recipe;
  initialProgress: RecipeProgress;
  userId?: string;
}

export default function CookClient({ recipe, initialProgress, userId }: CookClientProps) {
  const [progress, setProgress] = useState<RecipeProgress>(initialProgress);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    // Determine initial step based on progress
    if (progress.ingredientCheckedIds.length < recipe.ingredients.length) {
      return -1; // Still on ingredients
    }
    
    // Find first incomplete step
    for (let i = 0; i < recipe.steps.length; i++) {
      if (!isStepCompleted(recipe.steps[i].id, progress)) {
        return i;
      }
    }
    
    // All steps completed
    return recipe.steps.length;
  });
  
  const [isFullProcessOpen, setIsFullProcessOpen] = useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);

  // Calculate overall progress
  const overallProgress = calculateProgress(recipe, progress);
  const completedSteps = Object.values(progress.stepCompletion).filter(Boolean).length;
  const totalSteps = recipe.steps.length + 1; // +1 for ingredients phase
  const currentStep = currentStepIndex >= 0 && currentStepIndex < recipe.steps.length 
    ? recipe.steps[currentStepIndex] 
    : null;

  // Save progress to Firestore
  const saveProgressData = useCallback(async (newProgress: RecipeProgress) => {
    if (userId) {
      try {
        await saveProgress(userId, recipe.id, newProgress);
      } catch (error) {
        console.error('Failed to save progress:', error);
        // Could show a toast notification here
      }
    }
  }, [recipe.id, userId]);

  // Update progress and save
  const updateProgress = useCallback((updater: (prev: RecipeProgress) => RecipeProgress) => {
    setProgress(prev => {
      const newProgress = updater(prev);
      saveProgressData(newProgress);
      return newProgress;
    });
  }, [saveProgressData]);

  // Toggle ingredient checked state
  const toggleIngredient = (ingredientId: string) => {
    updateProgress(prev => ({
      ...prev,
      ingredientCheckedIds: prev.ingredientCheckedIds.includes(ingredientId)
        ? prev.ingredientCheckedIds.filter(id => id !== ingredientId)
        : [...prev.ingredientCheckedIds, ingredientId]
    }));
  };

  // Complete current step
  const completeCurrentStep = () => {
    if (!currentStep) return;

    updateProgress(prev => ({
      ...prev,
      stepCompletion: {
        ...prev.stepCompletion,
        [currentStep.id]: true
      }
    }));

    // Move to next step
    setCurrentStepIndex(prev => prev + 1);
  };

  // Jump to specific step
  const jumpToStep = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  // Navigation functions
  const goToNextStep = useCallback(() => {
    if (currentStepIndex === -1) {
      // Check if all ingredients are checked
      if (progress.ingredientCheckedIds.length === recipe.ingredients.length) {
        setCurrentStepIndex(0);
      } else {
        alert('Please check off all ingredients before starting to cook.');
      }
    } else if (currentStep && isStepCompleted(currentStep.id, progress)) {
      setCurrentStepIndex(prev => Math.min(prev + 1, recipe.steps.length));
    } else {
      alert('Please complete the current step before proceeding.');
    }
  }, [currentStepIndex, progress, recipe.ingredients.length, recipe.steps.length, currentStep]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStepIndex(prev => Math.max(prev - 1, -1));
  }, []);

  // Check for completion celebration
  useEffect(() => {
    if (overallProgress === 100 && !showCompletionCelebration) {
      setShowCompletionCelebration(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowCompletionCelebration(false), 3000);
    }
  }, [overallProgress, showCompletionCelebration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          goToNextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousStep();
          break;
        case 'o':
        case 'O':
          event.preventDefault();
          setIsFullProcessOpen(true);
          break;
        case 'Escape':
          if (isFullProcessOpen) {
            setIsFullProcessOpen(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [goToNextStep, goToPreviousStep, isFullProcessOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Completion Celebration */}
      {showCompletionCelebration && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
          🎉 Recipe completed! Great job! 🎉
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {recipe.title}
              </h1>
              <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span>🍽️ Serves {recipe.servings}</span>
                <span>⏱️ {recipe.totalTimeMins} minutes</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsFullProcessOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="View full process (O)"
            >
              📋 Overview
            </button>
          </div>
          
          <div className="space-y-2">
            <ProgressBar 
              value={overallProgress}
              showPercentage={true}
              ariaLabel="Recipe completion progress"
              className="mb-1"
            />
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {completedSteps}/{totalSteps} steps complete
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            💡 Use arrow keys or space to navigate • Press O for overview
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStepIndex === -1 ? (
          // Ingredients Phase
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                📋 Prepare Your Ingredients
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Check off each ingredient as you gather and prepare them
              </p>
            </div>

            <div className="space-y-3">
              {recipe.ingredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className={`flex items-center p-4 rounded-lg border-2 transition-colors ${
                    progress.ingredientCheckedIds.includes(ingredient.id)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => toggleIngredient(ingredient.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 mr-4 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      progress.ingredientCheckedIds.includes(ingredient.id)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-label={`Toggle ${ingredient.label}`}
                  >
                    {progress.ingredientCheckedIds.includes(ingredient.id) && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ingredient.label}
                      </span>
                      {ingredient.qty && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {ingredient.qty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="mb-4">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {progress.ingredientCheckedIds.length}/{recipe.ingredients.length} ingredients ready
                </span>
              </div>
              
              <button
                onClick={goToNextStep}
                disabled={progress.ingredientCheckedIds.length < recipe.ingredients.length}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Start Cooking! 👨‍🍳
              </button>
            </div>
          </div>
        ) : currentStepIndex < recipe.steps.length ? (
          // Cooking Step
          <div className="space-y-6">
            {/* Step Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Step {currentStepIndex + 1} of {recipe.steps.length}
                  </span>
                  {currentStep?.durationSec && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      ⏱️ {formatDuration(currentStep.durationSec)}
                    </span>
                  )}
                  {currentStep?.requiresConfirm && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      ✋ Manual confirm
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {isStepCompleted(currentStep?.id || '', progress) ? '✅ Completed' : '⏳ In progress'}
                </div>
              </div>

              {currentStep?.title && (
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {currentStep.title}
                </h2>
              )}

              <div className="prose dark:prose-invert max-w-none mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentStep?.instruction}
                </p>
              </div>

              {currentStep?.note && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">💡</span>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      {currentStep.note}
                    </p>
                  </div>
                </div>
              )}

              {/* Timer */}
              {currentStep?.durationSec && (
                <div className="mb-6">
                  <Timer
                    id={currentStep.id}
                    initialSec={currentStep.durationSec}
                    valueSec={progress.timers[currentStep.id]?.remainingSec}
                    running={progress.timers[currentStep.id]?.running}
                    startedAt={progress.timers[currentStep.id]?.startedAt}
                    onStateChange={(state) => {
                      updateProgress(prev => ({
                        ...prev,
                        timers: {
                          ...prev.timers,
                          [currentStep.id]: state
                        }
                      }));
                    }}
                    onComplete={() => {
                      console.log(`Timer completed for step: ${currentStep.title || `Step ${currentStepIndex + 1}`}`);
                    }}
                  />
                </div>
              )}

              {/* Step Completion */}
              <div className="flex items-center justify-between">
                {isStepCompleted(currentStep?.id || '', progress) ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Step completed!</span>
                  </div>
                ) : (
                  <button
                    onClick={completeCurrentStep}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    ✅ Complete Step
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={goToPreviousStep}
                disabled={currentStepIndex <= -1}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ← Previous
              </button>

              <button
                onClick={goToNextStep}
                disabled={!isStepCompleted(currentStep?.id || '', progress)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          // Recipe Completed
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Recipe Completed!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Congratulations! You&apos;ve successfully completed {recipe.title}.
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/cooking'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cook Another Recipe
              </button>
              
              <button
                onClick={() => jumpToStep(-1)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Review Recipe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Process Modal */}
      <FullProcess
        recipe={recipe}
        progress={progress}
        isOpen={isFullProcessOpen}
        onClose={() => setIsFullProcessOpen(false)}
        onJumpToStep={jumpToStep}
        currentStepIndex={currentStepIndex}
      />
    </div>
  );
}

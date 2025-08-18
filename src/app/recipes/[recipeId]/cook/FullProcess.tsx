// app/recipes/[recipeId]/cook/FullProcess.tsx
// Modal/drawer showing full recipe process with step navigation

'use client';

import React, { useEffect } from 'react';
import { Recipe, RecipeProgress } from '@/lib/types/recipe';
import { isStepCompleted, formatDuration } from '@/lib/progress';

interface FullProcessProps {
  recipe: Recipe;
  progress: RecipeProgress;
  isOpen: boolean;
  onClose: () => void;
  onJumpToStep: (stepIndex: number) => void;
  currentStepIndex: number;
}

export default function FullProcess({
  recipe,
  progress,
  isOpen,
  onClose,
  onJumpToStep,
  currentStepIndex,
}: FullProcessProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus trap for accessibility
  useEffect(() => {
    if (isOpen) {
      const modalElement = document.getElementById('full-process-modal');
      const focusableElements = modalElement?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const handleJumpToStep = (stepIndex: number) => {
    // Show confirmation dialog for jumping ahead
    const isJumpingAhead = stepIndex > currentStepIndex;
    const currentStep = recipe.steps[currentStepIndex];
    const targetStep = recipe.steps[stepIndex];

    if (isJumpingAhead && currentStep && !isStepCompleted(currentStep.id, progress)) {
      const confirmed = window.confirm(
        `You haven't completed the current step "${currentStep.title || `Step ${currentStepIndex + 1}`}". Are you sure you want to jump to "${targetStep.title || `Step ${stepIndex + 1}`}"?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    onJumpToStep(stepIndex);
    onClose();
  };

  const handleJumpToIngredients = () => {
    const confirmed = currentStepIndex > -1 
      ? window.confirm('Are you sure you want to go back to the ingredients phase?')
      : true;
    
    if (confirmed) {
      onJumpToStep(-1);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          id="full-process-modal"
          className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              Full Recipe Process
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto p-6">
            {/* Recipe info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {recipe.title}
              </h3>
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>🍽️ Serves {recipe.servings}</span>
                <span>⏱️ {recipe.totalTimeMins} minutes</span>
                <span>📝 {recipe.steps.length} steps</span>
              </div>
            </div>

            {/* Ingredients Phase */}
            <div className="mb-6">
              <button
                onClick={handleJumpToIngredients}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentStepIndex === -1
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      📋 Ingredients Preparation
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Check off all ingredients before cooking
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {progress.ingredientCheckedIds.length === recipe.ingredients.length ? (
                      <span className="text-green-600 dark:text-green-400">✅ Complete</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        {progress.ingredientCheckedIds.length}/{recipe.ingredients.length}
                      </span>
                    )}
                    {currentStepIndex === -1 && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Current</span>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Cooking Steps */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                🍳 Cooking Steps
              </h4>
              
              {recipe.steps.map((step, index) => {
                const isCompleted = isStepCompleted(step.id, progress);
                const isCurrent = index === currentStepIndex;
                const isAccessible = index <= currentStepIndex + 1; // Can access current + next step

                return (
                  <button
                    key={step.id}
                    onClick={() => handleJumpToStep(index)}
                    disabled={!isAccessible && index > currentStepIndex}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isCompleted
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Step {index + 1}
                          </span>
                          {step.durationSec && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                              ⏱️ {formatDuration(step.durationSec)}
                            </span>
                          )}
                          {step.requiresConfirm && (
                            <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">
                              ✋ Confirm
                            </span>
                          )}
                        </div>
                        
                        {step.title && (
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            {step.title}
                          </h5>
                        )}
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {step.instruction}
                        </p>
                        
                        {step.note && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            💡 {step.note}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {isCompleted && (
                          <span className="text-green-600 dark:text-green-400">✅</span>
                        )}
                        {isCurrent && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                            Current
                          </span>
                        )}
                        {!isAccessible && index > currentStepIndex && (
                          <span className="text-gray-400 text-sm">🔒</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click any accessible step to jump to it
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

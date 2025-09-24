// app/recipes/[recipeId]/cook/page.tsx
// Client-side page for recipe cooking interface

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Recipe, RecipeProgress } from '@/lib/types/recipe';
import { loadRecipe, loadProgress } from '@/lib/firestore';
import CookClient from './CookClient';

/**
 * Create default recipe progress for new cooking sessions
 */
function createDefaultProgress(): RecipeProgress {
  return {
    ingredientCheckedIds: [],
    currentStepIndex: -1, // Start with ingredients
    stepCompletion: {},
    timers: {},
    updatedAt: Date.now(),
  };
}

export default function CookPage() {
  const params = useParams();
  const recipeId = params.recipeId as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [initialProgress, setInitialProgress] = useState<RecipeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipeData() {
      try {
        setLoading(true);
        setError(null);

        // Load recipe data
        const recipeData = await loadRecipe(recipeId);
        
        if (!recipeData) {
          setError('Recipe not found');
          return;
        }

        setRecipe(recipeData);

        // TODO: Get user ID from authentication context
        // For now, we'll use a placeholder
        const userId: string | undefined = undefined;
        
        // Load existing progress or create default
        let progress: RecipeProgress;
        
        if (userId) {
          try {
            const existingProgress = await loadProgress(userId, recipeData.id);
            progress = existingProgress || createDefaultProgress();
          } catch (error) {
            console.error('Error loading recipe progress:', error);
            progress = createDefaultProgress();
          }
        } else {
          progress = createDefaultProgress();
        }

        setInitialProgress(progress);
      } catch (err) {
        console.error('Error loading recipe data:', err);
        setError('Failed to load recipe');
      } finally {
        setLoading(false);
      }
    }

    if (recipeId) {
      loadRecipeData();
    }
  }, [recipeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Recipe Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || "The recipe you're looking for doesn't exist or has been removed."}
          </p>
          <a
            href="/cooking"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Browse Recipes
          </a>
        </div>
      </div>
    );
  }

  if (!initialProgress) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Setting up cooking session...</p>
        </div>
      </div>
    );
  }

  return (
    <CookClient 
      recipe={recipe}
      initialProgress={initialProgress}
    />
  );
}

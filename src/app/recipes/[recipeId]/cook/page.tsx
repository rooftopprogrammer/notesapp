// app/recipes/[recipeId]/cook/page.tsx
// Server-side page for recipe cooking interface

import { Metadata } from 'next';
import { loadRecipe, loadProgress } from '@/lib/firestore';
import { RecipeProgress } from '@/lib/types/recipe';
import CookClient from './CookClient';

interface PageProps {
  params: {
    recipeId: string;
  };
}

export async function generateStaticParams(): Promise<{ recipeId: string }[]> {
  // For development, return a few sample recipe IDs
  // In production, this would come from your CMS/database
  return [
    { recipeId: 'tandoori-chicken-home' },
    { recipeId: 'sample-recipe-1' },
    { recipeId: 'sample-recipe-2' },
  ];
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const recipe = await loadRecipe(params.recipeId);
    return {
      title: recipe ? `Cook ${recipe.title} | RNotes` : 'Cook Recipe | RNotes',
      description: recipe 
        ? `Step-by-step cooking guide for ${recipe.title}. Interactive timers, progress tracking, and ingredient checklist.`
        : 'Interactive cooking interface with timers and step-by-step guidance.',
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Cook Recipe | RNotes',
      description: 'Interactive cooking interface with timers and step-by-step guidance.',
    };
  }
}

export default async function CookPage({ params }: PageProps) {
  try {
    // Load recipe data
    const recipe = await loadRecipe(params.recipeId);
    
    if (!recipe) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Recipe Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The recipe you&apos;re looking for doesn&apos;t exist or has been removed.
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

    // TODO: Get user ID from authentication context
    // For now, we'll use a placeholder
    const userId: string | undefined = undefined;
    
    // Load existing progress or create default
    let initialProgress: RecipeProgress;
    
    if (userId) {
      try {
        const existingProgress = await loadProgress(userId, recipe.id);
        initialProgress = existingProgress || createDefaultProgress();
      } catch (error) {
        console.error('Error loading recipe progress:', error);
        initialProgress = createDefaultProgress();
      }
    } else {
      initialProgress = createDefaultProgress();
    }

    return (
      <CookClient 
        recipe={recipe}
        initialProgress={initialProgress}
        userId={userId}
      />
    );
    
  } catch (error) {
    console.error('Error loading recipe or progress:', error);
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something Went Wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn&apos;t load the recipe. Please try again later.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <a
              href="/cooking"
              className="inline-block px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Browse Recipes
            </a>
          </div>
        </div>
      </div>
    );
  }
}

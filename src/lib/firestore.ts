// lib/firestore.ts
// Firestore utilities for recipes and progress tracking

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe, RecipeProgress } from './types/recipe';

// Feature flag for mock data vs Firestore
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_USE_FIRESTORE;

/**
 * Sample recipe data for development/testing
 */
const MOCK_RECIPE: Recipe = {
  id: 'tandoori-chicken-home',
  title: 'Tandoori Chicken (Home Oven)',
  heroImageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  servings: 4,
  totalTimeMins: 70,
  ingredients: [
    { id: 'i1', label: 'Whole chicken (1.2–1.5 kg)', qty: '1 piece' },
    { id: 'i2', label: 'Thick curd (1 cup)', qty: '250ml' },
    { id: 'i3', label: 'Ginger-garlic paste', qty: '3 tbsp' },
    { id: 'i4', label: 'Kashmiri chilli powder', qty: '2.5 tbsp' },
    { id: 'i5', label: 'Mustard oil', qty: '3 tbsp' },
    { id: 'i6', label: 'Fresh lemons', qty: '2 pieces' },
    { id: 'i7', label: 'Salt & spices (garam masala, cumin)', qty: 'to taste' }
  ],
  steps: [
    { 
      id: 's1', 
      title: 'Prep & Slits', 
      instruction: 'Butterfly the chicken and make deep slits (1 inch deep) all over. This helps the marinade penetrate better and ensures even cooking.',
      durationSec: 0,
      note: 'Use a sharp knife and be careful with the cuts'
    },
    { 
      id: 's2', 
      title: 'First Marinade', 
      instruction: 'Rub the chicken with lemon juice, salt, chilli powder, and ginger-garlic paste. Make sure to get the marinade into all the slits.',
      durationSec: 1200,
      note: 'Let it rest for 20 minutes to allow the flavors to develop'
    },
    { 
      id: 's3', 
      title: 'Second Marinade', 
      instruction: 'Mix thick curd with remaining spices and mustard oil. Coat the chicken thoroughly with this mixture and let it marinate.',
      durationSec: 7200,
      note: 'For best results, marinate for 2+ hours or overnight'
    },
    { 
      id: 's4', 
      title: 'Bake Side 1', 
      instruction: 'Preheat oven to 200°C (convection mode). Place chicken on a rack and bake for 20-25 minutes.',
      durationSec: 1500,
      requiresConfirm: true,
      note: 'Check that the chicken is browning nicely'
    },
    { 
      id: 's5', 
      title: 'Flip & Baste', 
      instruction: 'Carefully flip the chicken and baste lightly with the drippings or some oil.',
      durationSec: 0,
      note: 'Be careful with the hot chicken'
    },
    { 
      id: 's6', 
      title: 'Bake Side 2', 
      instruction: 'Continue baking the flipped chicken for another 20-25 minutes until cooked through.',
      durationSec: 1500,
      requiresConfirm: true
    },
    { 
      id: 's7', 
      title: 'Grill Finish', 
      instruction: 'Switch to grill mode and grill for 3-5 minutes to get that perfect charred finish.',
      durationSec: 300,
      note: 'Watch carefully to avoid burning'
    }
  ],
  tags: ['tandoori', 'oven', 'chicken', 'indian', 'grilled'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Load a recipe by ID from Firestore or mock data
 */
export async function loadRecipe(recipeId: string): Promise<Recipe | null> {
  if (USE_MOCK_DATA) {
    // Return mock data for development
    console.log('Using mock recipe data');
    return MOCK_RECIPE;
  }

  try {
    const recipeRef = doc(db, 'recipes', recipeId);
    const recipeSnap = await getDoc(recipeRef);
    
    if (!recipeSnap.exists()) {
      console.warn(`Recipe not found: ${recipeId}`);
      return null;
    }

    const data = recipeSnap.data();
    return {
      id: recipeSnap.id,
      ...data,
    } as Recipe;
  } catch (error) {
    console.error('Error loading recipe:', error);
    // Fallback to mock data on error
    return MOCK_RECIPE;
  }
}

/**
 * Save recipe progress to Firestore
 */
export async function saveProgress(
  uid: string, 
  recipeId: string, 
  progress: RecipeProgress
): Promise<void> {
  if (!uid || USE_MOCK_DATA) {
    console.log('Skipping Firestore save (no user or mock mode)');
    return;
  }

  try {
    const progressRef = doc(db, 'users', uid, 'progress', recipeId);
    await setDoc(progressRef, {
      ...progress,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('Progress saved to Firestore');
  } catch (error) {
    console.error('Error saving progress:', error);
    // Don't throw - progress is still saved to localStorage
  }
}

/**
 * Load recipe progress from Firestore
 */
export async function loadProgress(
  uid: string, 
  recipeId: string
): Promise<RecipeProgress | null> {
  if (!uid || USE_MOCK_DATA) {
    console.log('Skipping Firestore load (no user or mock mode)');
    return null;
  }

  try {
    const progressRef = doc(db, 'users', uid, 'progress', recipeId);
    const progressSnap = await getDoc(progressRef);
    
    if (!progressSnap.exists()) {
      return null;
    }

    const data = progressSnap.data();
    return {
      ...data,
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    } as RecipeProgress;
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

/**
 * Create a new recipe in Firestore
 */
export async function createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const recipesRef = collection(db, 'recipes');
    const recipeData = {
      ...recipe,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = doc(recipesRef);
    await setDoc(docRef, recipeData);
    
    console.log('Recipe created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
}

/**
 * Update an existing recipe in Firestore
 */
export async function updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<void> {
  try {
    const recipeRef = doc(db, 'recipes', recipeId);
    await updateDoc(recipeRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    console.log('Recipe updated:', recipeId);
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
}

/**
 * Debounced progress saver to avoid too many Firestore writes
 */
class ProgressSaver {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 2000;

  save(uid: string, recipeId: string, progress: RecipeProgress): void {
    const key = `${uid}-${recipeId}`;
    
    // Clear existing timeout
    const existing = this.timeouts.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new debounced save
    const timeout = setTimeout(() => {
      saveProgress(uid, recipeId, progress);
      this.timeouts.delete(key);
    }, this.DEBOUNCE_MS);

    this.timeouts.set(key, timeout);
  }

  // Force immediate save (for important events)
  saveImmediate(uid: string, recipeId: string, progress: RecipeProgress): void {
    const key = `${uid}-${recipeId}`;
    
    // Clear any pending save
    const existing = this.timeouts.get(key);
    if (existing) {
      clearTimeout(existing);
      this.timeouts.delete(key);
    }

    // Save immediately
    saveProgress(uid, recipeId, progress);
  }
}

export const progressSaver = new ProgressSaver();

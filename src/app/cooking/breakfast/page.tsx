'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Recipe {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  servings: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  ingredients: string[];
  instructions: string[];
  image?: string;
}

const BREAKFAST_RECIPES: Recipe[] = [
  {
    id: 'idli',
    name: 'Soft Idli',
    description: 'Steamed rice and lentil cakes, perfect for breakfast',
    cookTime: '20 mins',
    servings: '4',
    difficulty: 'Medium',
    tags: ['South Indian', 'Steamed', 'Healthy'],
    ingredients: [
      '2 cups idli rice',
      '1 cup urad dal',
      'Salt to taste',
      'Water as needed'
    ],
    instructions: [
      'Soak rice and dal separately for 4-6 hours',
      'Grind both into smooth batter',
      'Mix with salt and ferment overnight',
      'Steam in idli steamer for 12-15 minutes'
    ]
  },
  {
    id: 'dosa',
    name: 'Crispy Dosa',
    description: 'Golden crispy crepes made from fermented batter',
    cookTime: '15 mins',
    servings: '4',
    difficulty: 'Medium',
    tags: ['South Indian', 'Crispy', 'Fermented'],
    ingredients: [
      '3 cups dosa rice',
      '1 cup urad dal',
      '1/2 tsp fenugreek seeds',
      'Salt to taste',
      'Oil for cooking'
    ],
    instructions: [
      'Soak rice, dal, and fenugreek seeds separately',
      'Grind into smooth batter',
      'Ferment overnight',
      'Spread thin on hot tawa and cook until crispy'
    ]
  },
  {
    id: 'upma',
    name: 'Rava Upma',
    description: 'Savory semolina breakfast dish with vegetables',
    cookTime: '15 mins',
    servings: '3',
    difficulty: 'Easy',
    tags: ['Quick', 'Healthy', 'Vegetarian'],
    ingredients: [
      '1 cup rava (semolina)',
      '2 tbsp oil',
      '1 tsp mustard seeds',
      '2 green chilies',
      '1 onion chopped',
      'Curry leaves',
      'Salt to taste',
      '2.5 cups water'
    ],
    instructions: [
      'Roast rava until aromatic',
      'Heat oil, add mustard seeds and curry leaves',
      'Add onions and green chilies, sauté',
      'Add water, salt, and boiled rava gradually',
      'Cook until thick consistency'
    ]
  }
];

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  Hard: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
};

export default function BreakfastPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredRecipes = BREAKFAST_RECIPES.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = selectedDifficulty === 'all' || recipe.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/cooking"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Cooking
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                🌅 Breakfast (Tiffins)
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🌅 Breakfast Recipes
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start your day with traditional breakfast items and delicious tiffins
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {recipe.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
                  {recipe.difficulty}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                {recipe.description}
              </p>
              
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span>⏱️ {recipe.cookTime}</span>
                <span>👥 {recipe.servings} servings</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {recipe.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              No recipes found
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Add Recipe Button */}
        <div className="text-center">
          <button className="inline-flex items-center px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors gap-2 shadow-lg hover:shadow-xl">
            ➕ Add New Recipe
          </button>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedRecipe.name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>⏱️ {selectedRecipe.cookTime}</span>
                    <span>👥 {selectedRecipe.servings} servings</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[selectedRecipe.difficulty]}`}>
                      {selectedRecipe.difficulty}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {selectedRecipe.description}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Ingredients
                  </h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <span className="text-yellow-500 mt-1">•</span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-3 text-gray-600 dark:text-gray-300">
                        <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {selectedRecipe.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                  Save to Favorites
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

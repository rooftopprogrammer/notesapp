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
}

const CHUTNEY_PICKLE_RECIPES: Recipe[] = [
  {
    id: 'coconut-chutney',
    name: 'Coconut Chutney',
    description: 'Classic South Indian coconut chutney with curry leaves',
    cookTime: '10 mins',
    servings: '4',
    difficulty: 'Easy',
    tags: ['South Indian', 'Coconut', 'Fresh']
  },
  {
    id: 'mango-pickle',
    name: 'Mango Pickle (Avakai)',
    description: 'Traditional Andhra style spicy mango pickle',
    cookTime: '30 mins',
    servings: '10',
    difficulty: 'Medium',
    tags: ['Andhra Style', 'Spicy', 'Long Lasting']
  },
  {
    id: 'mint-chutney',
    name: 'Mint Chutney',
    description: 'Fresh mint leaves chutney with green chilies',
    cookTime: '5 mins',
    servings: '4',
    difficulty: 'Easy',
    tags: ['Fresh', 'Aromatic', 'Quick']
  }
];

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  Hard: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
};

export default function ChutneysPicklesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredRecipes = CHUTNEY_PICKLE_RECIPES.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = selectedDifficulty === 'all' || recipe.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
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
                🥗 Chutneys & Pickles
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🥗 Chutneys & Pickles
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Traditional pachadis and uragaya to enhance your meals
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded-full"
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
          <button className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors gap-2 shadow-lg hover:shadow-xl">
            ➕ Add New Recipe
          </button>
        </div>
      </div>
    </div>
  );
}

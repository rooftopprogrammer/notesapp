'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const COOKING_CATEGORIES = [
  {
    id: 'breakfast',
    name: 'Breakfast (Tiffins)',
    icon: '🌅',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    bgColor: 'bg-yellow-600 hover:bg-yellow-700',
    description: 'Traditional breakfast items and tiffins'
  },
  {
    id: 'lunch-dinner',
    name: 'Lunch / Dinner (Main Curries)',
    icon: '🍛',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    bgColor: 'bg-red-600 hover:bg-red-700',
    description: 'Main course curries and dishes'
  },
  {
    id: 'chutneys-pickles',
    name: 'Chutneys & Pickles (Pachadis & Uragaya)',
    icon: '🥗',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    bgColor: 'bg-green-600 hover:bg-green-700',
    description: 'Traditional chutneys and pickles'
  },
  {
    id: 'starters-snacks',
    name: 'Starters / Snacks',
    icon: '🥨',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    bgColor: 'bg-orange-600 hover:bg-orange-700',
    description: 'Appetizers and light snacks'
  },
  {
    id: 'rice-varieties',
    name: 'Rice Varieties',
    icon: '🍚',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    description: 'Different rice preparations and biryanis'
  },
  {
    id: 'soups',
    name: 'Soups',
    icon: '🍲',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    bgColor: 'bg-purple-600 hover:bg-purple-700',
    description: 'Traditional and restaurant-style soups'
  },
  {
    id: 'grilled-tandoori',
    name: 'Grilled / Tandoori / BBQ',
    icon: '🔥',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
    bgColor: 'bg-pink-600 hover:bg-pink-700',
    description: 'Grilled and tandoori specialties'
  },
  {
    id: 'breads',
    name: 'Breads',
    icon: '🥖',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    bgColor: 'bg-amber-600 hover:bg-amber-700',
    description: 'Rotis, naans, and other breads'
  },
  {
    id: 'sweets-desserts',
    name: 'Sweets & Desserts',
    icon: '🍰',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    bgColor: 'bg-indigo-600 hover:bg-indigo-700',
    description: 'Traditional sweets and desserts'
  },
  {
    id: 'beverages',
    name: 'Beverages',
    icon: '🥤',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    bgColor: 'bg-teal-600 hover:bg-teal-700',
    description: 'Traditional and modern beverages'
  },
  {
    id: 'evening-snacks',
    name: 'Evening Snacks / Street Foods',
    icon: '🍟',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    bgColor: 'bg-emerald-600 hover:bg-emerald-700',
    description: 'Street food and evening snacks'
  }
];

export default function CookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                🍳 Cooking Recipes
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            🍳 Cooking Recipes
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover and organize your favorite recipes across different cuisines and meal types
          </p>
        </div>

        {/* Featured Recipe */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            ⭐ Featured Recipe
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
            <div className="md:flex">
              <div className="md:w-1/3">
                <Image 
                  src="https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Tandoori Chicken"
                  width={800}
                  height={600}
                  className="w-full h-48 md:h-full object-cover"
                />
              </div>
              <div className="md:w-2/3 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                    🔥 Tandoori
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    70 minutes • Serves 4
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Tandoori Chicken (Home Oven)
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Authentic tandoori chicken made in your home oven! Experience our interactive 
                  step-by-step cooking guide with timers and progress tracking.
                </p>
                
                <div className="flex gap-3">
                  <Link 
                    href="/recipes/tandoori-chicken-home/cook"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
                  >
                    👨‍🍳 Try Interactive Cooking
                  </Link>
                  <Link 
                    href="/cooking/grilled-tandoori"
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🔥 More Grilled Recipes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {COOKING_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/cooking/${category.id}`}
              className="group"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-full ${category.bgColor} flex items-center justify-center text-3xl transition-colors`}>
                    {category.icon}
                  </div>
                  
                  {/* Category Name */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {category.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {category.description}
                  </p>
                  
                  {/* Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${category.color}`}>
                    View Recipes
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Recipe Collection Stats
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Organize your culinary journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {COOKING_CATEGORIES.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Recipe Categories
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                ∞
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Endless Possibilities
              </div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                🌟
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Traditional & Modern
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                💫
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Easy to Follow
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/cooking/favorites"
            className="inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors gap-2 shadow-lg hover:shadow-xl"
          >
            ⭐ Favorite Recipes
          </Link>
          
          <Link
            href="/cooking/recent"
            className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors gap-2 shadow-lg hover:shadow-xl"
          >
            🕒 Recently Viewed
          </Link>
          
          <Link
            href="/cooking/add"
            className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors gap-2 shadow-lg hover:shadow-xl"
          >
            ➕ Add New Recipe
          </Link>
        </div>
      </div>
    </div>
  );
}

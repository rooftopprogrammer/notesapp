'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function GrilledTandooriPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/cooking" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                ← Back to Cooking
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">🔥 Grilled / Tandoori / BBQ</h1>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">🔥 Grilled & Tandoori</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Grilled and tandoori specialties</p>
        </div>
        {/* Featured Recipe */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Tandoori Chicken (Home Oven)
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Authentic tandoori chicken made in your home oven! Marinated with yogurt and spices, 
                  then cooked to perfection with a smoky, charred flavor.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm">
                    Ginger-Garlic
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm">
                    Yogurt Marinade
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm">
                    Kashmiri Chili
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <Link 
                    href="/recipes/tandoori-chicken-home/cook"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    👨‍🍳 Start Cooking
                  </Link>
                  <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors">
                    📖 View Recipe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">More Recipes Coming Soon</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">More sizzling grilled recipes coming your way!</p>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">➕ Add Recipe</button>
        </div>
      </div>
    </div>
  );
}

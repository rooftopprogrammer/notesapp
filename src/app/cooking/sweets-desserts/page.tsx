'use client';

import React from 'react';
import Link from 'next/link';

export default function SweetsDessertsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/cooking" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                ← Back to Cooking
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">🍰 Sweets & Desserts</h1>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">🍰 Sweets & Desserts</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Traditional sweets and desserts</p>
        </div>
        <div className="text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Coming Soon</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-6">Sweet treats are being prepared for you!</p>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors">➕ Add Recipe</button>
        </div>
      </div>
    </div>
  );
}

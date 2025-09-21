'use client';

import Link from 'next/link';

export default function FamilyDietTracker() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
              <span className="text-2xl">🥗</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Family Diet Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Plan and track your family&apos;s nutritional journey
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/hometracker"
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home Tracker
            </Link>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center py-16 px-6">
            <div className="w-24 h-24 mx-auto mb-6 bg-teal-100 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">🥗</span>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Family Diet Tracker
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              This page is ready for your family diet tracking features. 
              You can add meal planning, dietary restrictions, nutrition goals, and more.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <Link
                  href="/hometracker/diet/meal-planning"
                  className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border-2 border-teal-200 dark:border-teal-700 hover:border-teal-300 dark:hover:border-teal-600 transition-colors cursor-pointer relative"
                >
                  {/* Functional status icon */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-2xl mb-2">📅</div>
                  <h4 className="font-medium text-teal-900 dark:text-teal-100 mb-1">Meal Planning</h4>
                  <p className="text-sm text-teal-700 dark:text-teal-300">Plan weekly family meals</p>
                  <span className="text-xs text-green-600 font-medium mt-1 block">✓ Functional</span>
                </Link>

                <Link
                  href="/hometracker/diet/family-profiles"
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer relative"
                >
                  {/* Functional status icon */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Family Profiles</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Manage family member info</p>
                  <span className="text-xs text-green-600 font-medium mt-1 block">✓ Functional</span>
                </Link>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg relative">
                  {/* Non-functional status icon */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-2xl mb-2">🥘</div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Recipe Management</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Store family favorite recipes</p>
                  <span className="text-xs text-red-500 font-medium mt-1 block">Not Functional</span>
                </div>
                
                <Link
                  href="/hometracker/diet/grocery-lists"
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 transition-colors cursor-pointer relative"
                >
                  {/* Functional status icon */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-2xl mb-2">🛒</div>
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Grocery Lists</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">Generate shopping lists</p>
                  <span className="text-xs text-green-600 font-medium mt-1 block">✓ Functional</span>
                </Link>

                <Link
                  href="/hometracker/diet/instructions"
                  className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border-2 border-teal-200 dark:border-teal-700 hover:border-teal-300 dark:hover:border-teal-600 transition-colors cursor-pointer relative"
                >
                  {/* Functional status icon */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-2xl mb-2">📝</div>
                  <h4 className="font-medium text-teal-900 dark:text-teal-100 mb-1">Instructions</h4>
                  <p className="text-sm text-teal-700 dark:text-teal-300">Add and manage diet instructions</p>
                  <span className="text-xs text-green-600 font-medium mt-1 block">✓ Functional</span>
                </Link>
              </div>

              {/* Status Legend */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Feature Status:</h5>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-green-600 dark:text-green-400">Functional - Ready to use</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-red-600 dark:text-red-400">Not Functional - Coming soon</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                  disabled
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Coming Soon - Add Diet Entry
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This feature will be available in future updates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
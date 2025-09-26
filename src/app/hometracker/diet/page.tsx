'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Target } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

export default function FamilyDietTracker() {
  // Set countdown end date to September 25, 2026 (365 days from today)
  const endDate = new Date('2026-09-25T23:59:59');
  
  // Diet start date - September 20, 2025 (Day 1)
  const dietStartDate = new Date('2025-09-20T00:00:00');
  
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [dietProgress, setDietProgress] = useState({
    currentDay: 0,
    streak: 0
  });

  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      setCurrentDateTime(now);
      
      // Calculate days since diet started
      const timeDiff = now.getTime() - dietStartDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 because Day 1 starts from start date
      
      setDietProgress({
        currentDay: daysDiff > 0 ? daysDiff : 0,
        streak: daysDiff > 0 ? daysDiff : 0 // For now, streak = current day (can be enhanced later)
      });
    };

    // Update immediately
    updateProgress();
    
    // Update every minute
    const timer = setInterval(updateProgress, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

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

        {/* 365-Day Countdown Timer */}
        <CountdownTimer 
          endDate={endDate}
          title="365-Day Diet Journey"
          description="Your family's year-long nutrition transformation countdown"
        />

        {/* Diet Progress Tracker */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Diet Started Progress</h2>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateTime(currentDateTime)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 text-center">
              <div className="bg-white/20 rounded-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold">{dietProgress.currentDay}</div>
                <div className="text-xs text-white/80 uppercase tracking-wider">Current Day</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold">{dietProgress.streak}</div>
                <div className="text-xs text-white/80 uppercase tracking-wider">Day Streak</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4 min-w-[100px]">
                <div className="text-lg font-bold">
                  {((dietProgress.currentDay / 365) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-white/80 uppercase tracking-wider">Complete</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center text-sm text-white/80 mb-2">
              <div className="flex items-center gap-1">
                <span>🚀</span>
                <span>Started: Sep 20, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>Target: Sep 25, 2026 (365 days)</span>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${Math.min((dietProgress.currentDay / 365) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-center mt-2 text-white/80 text-xs">
              {365 - dietProgress.currentDay} days remaining
            </div>
          </div>
        </div>

        {/* Empty State - Modernized */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Simplified Header */}
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🥗</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Family Diet Tracker
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Comprehensive nutrition management for your family's health journey
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div className="p-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
              Available Features
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Meal Planning */}
              <Link
                href="/hometracker/diet/meal-planning"
                className="group relative p-6 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-xl border border-teal-200 dark:border-teal-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl mb-4">📅</div>
                <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-2 group-hover:text-teal-700">Meal Planning</h4>
                <p className="text-sm text-teal-700 dark:text-teal-300 mb-3">Plan and organize weekly family meals</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Active
                </span>
              </Link>

              {/* Family Profiles */}
              <Link
                href="/hometracker/diet/family-profiles"
                className="group relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl mb-4">👥</div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 group-hover:text-blue-700">Family Profiles</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">Manage dietary preferences and restrictions</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Active
                </span>
              </Link>
              
              {/* Recipe Management */}
              <div className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl border border-gray-200 dark:border-gray-600 opacity-75">
                <div className="absolute top-4 right-4 w-6 h-6 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl mb-4 opacity-60">🥘</div>
                <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Recipe Management</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Store and organize family recipes</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  Coming Soon
                </span>
              </div>
              
              {/* Grocery Lists */}
              <Link
                href="/hometracker/diet/grocery-lists"
                className="group relative p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl mb-4">🛒</div>
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 group-hover:text-emerald-700">Grocery Lists</h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">Smart shopping list generation</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Active
                </span>
              </Link>

              {/* Instructions */}
              <Link
                href="/hometracker/diet/instructions"
                className="group relative p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl mb-4">📝</div>
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 group-hover:text-indigo-700">Diet Instructions</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">Personalized nutrition guidelines</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Active
                </span>
              </Link>

              {/* Notes */}
              <Link
                href="/hometracker/diet/notes"
                className="group relative p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl mb-4">📓</div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 group-hover:text-purple-700">Diet Journal</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">Track progress and observations</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Active
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
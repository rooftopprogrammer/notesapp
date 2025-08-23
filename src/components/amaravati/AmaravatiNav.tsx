// components/amaravati/AmaravatiNav.tsx
// Navigation component for Amaravati routes

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lightbulb, Calendar, BarChart3 } from 'lucide-react';

const routes = [
  {
    name: 'Ideas',
    href: '/amaravati/ideas',
    icon: Lightbulb,
    description: 'Collect places and intel'
  },
  {
    name: 'Plan',
    href: '/amaravati/plan',
    icon: Calendar,
    description: 'Daily visit planning'
  },
  {
    name: 'Dashboard',
    href: '/amaravati/dashboard',
    icon: BarChart3,
    description: 'Analytics and insights'
  }
];

export default function AmaravatiNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link 
              href="/amaravati/ideas"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Amaravati Tracker
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {routes.map((route) => {
                const isActive = pathname === route.href;
                const Icon = route.icon;
                
                return (
                  <Link
                    key={route.name}
                    href={route.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={route.description}
                  >
                    <Icon className="h-4 w-4" />
                    {route.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <select
              value={pathname}
              onChange={(e) => window.location.href = e.target.value}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {routes.map((route) => (
                <option key={route.name} value={route.href}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
}

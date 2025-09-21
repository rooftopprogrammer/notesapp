'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { dailyDietPlanService } from '@/lib/firebase/diet-tracker';
import { GroceryItem } from '@/lib/types/diet-tracker';
import { formatDate } from '@/lib/utils/diet-tracker-utils';

export default function GroceryListsPage() {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: formatDate(new Date()),
    end: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days from now
  });

  const consolidateGroceryItems = useCallback((items: GroceryItem[]): GroceryItem[] => {
    const itemMap = new Map<string, GroceryItem>();
    
    items.forEach(item => {
      const key = `${item.name}-${item.unit}`;
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.requiredQuantity += item.requiredQuantity;
        existing.needToPurchase += item.needToPurchase;
        existing.estimatedCost = (existing.estimatedCost || 0) + (item.estimatedCost || 0);
      } else {
        itemMap.set(key, { ...item });
      }
    });
    
    return Array.from(itemMap.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, []);

  const loadGroceryItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await dailyDietPlanService.getByDateRange(
        selectedDateRange.start, 
        selectedDateRange.end
      );
      
      if (response.success && response.data) {
        // Consolidate grocery items from all plans
        const allItems: GroceryItem[] = [];
        response.data.forEach(plan => {
          if (plan.extractedData?.groceryList) {
            allItems.push(...plan.extractedData.groceryList);
          }
        });
        
        // Group by item name and sum quantities
        const consolidatedItems = consolidateGroceryItems(allItems);
        setGroceryItems(consolidatedItems);
      }
    } catch (error) {
      console.error('Error loading grocery items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateRange.start, selectedDateRange.end, consolidateGroceryItems]);

  useEffect(() => {
    loadGroceryItems();
  }, [loadGroceryItems]);

  const toggleItemStatus = (itemId: string) => {
    setGroceryItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, status: item.status === 'purchased' ? 'out_of_stock' : 'purchased' }
          : item
      )
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'vegetables': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'proteins': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'grains': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'dairy': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'fruits': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'spices': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'nuts': 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      'condiments': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[category as keyof typeof colors] || colors.condiments;
  };

  const groupedItems = groceryItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, GroceryItem[]>);

  const totalCost = groceryItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  const purchasedItems = groceryItems.filter(item => item.status === 'purchased').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Grocery Lists
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Consolidated shopping list from your meal plans
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/hometracker/diet"
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ← Back to Diet Tracker
            </Link>
            <Link 
              href="/hometracker/diet/meal-planning"
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              📅 Meal Planning
            </Link>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Date Range
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadGroceryItems}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
              >
                {isLoading ? 'Loading...' : 'Update List'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{groceryItems.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Purchased</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {purchasedItems}/{groceryItems.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalCost}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grocery Items by Category */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category)}`}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {items.length} items
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                        item.status === 'purchased'
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600'
                      }`}
                      onClick={() => toggleItemStatus(item.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            item.status === 'purchased' 
                              ? 'line-through text-gray-500 dark:text-gray-400' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {item.requiredQuantity} {item.unit}
                          </p>
                          {(item.estimatedCost || 0) > 0 && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              ₹{item.estimatedCost}
                            </p>
                          )}
                        </div>
                        <div className="ml-3">
                          {item.status === 'purchased' ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {groceryItems.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🛒</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No grocery items found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload meal plans with grocery lists to see items here.
            </p>
            <Link 
              href="/hometracker/diet/meal-planning"
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              📅 Go to Meal Planning
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
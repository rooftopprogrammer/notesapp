'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GroceryItem, GroceryPlan } from '@/lib/types/diet-tracker';
import { dailyDietPlanService, groceryPlanService } from '@/lib/firebase/diet-tracker';
import { formatDate, addDays } from '@/lib/utils/diet-tracker-utils';

interface GroceryListItem extends GroceryItem {
  checked: boolean;
  tempQuantity?: number;
}

export default function GroceryPlanningPage() {
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));
  const [endDate, setEndDate] = useState<string>(addDays(formatDate(new Date()), 7));
  const [isGenerating, setIsGenerating] = useState(false);
  const [groceryPlan, setGroceryPlan] = useState<GroceryPlan | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'priority'>('category');
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    'all', 'grains', 'vegetables', 'proteins', 'dairy', 'spices', 'fruits', 'nuts', 'condiments'
  ];

  const priorities = [
    { value: 'high', label: 'High', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' }
  ];

  const loadExistingPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await groceryPlanService.getActive();
      if (response.success && response.data && response.data.length > 0) {
        const plan = response.data[0]; // Get the most recent active plan
        setGroceryPlan(plan);
        
        // Convert to GroceryListItem format
        const listItems: GroceryListItem[] = plan.groceryItems.map((item: GroceryItem) => ({
          ...item,
          checked: item.status === 'purchased'
        }));
        setGroceryItems(listItems);
      }
    } catch (error) {
      console.error('Error loading grocery plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateGroceryList = async () => {
    setIsGenerating(true);
    
    try {
      // Get all diet plans in the date range
      const response = await dailyDietPlanService.getByDateRange(startDate, endDate);
      if (!response.success || !response.data) {
        alert('No diet plans found for the selected date range');
        return;
      }

      const dietPlans = response.data;
      
      // Consolidate all grocery items from meal plans
      const consolidatedItems: { [key: string]: GroceryListItem } = {};
      
      dietPlans.forEach(plan => {
        plan.extractedData.groceryList.forEach(groceryItem => {
          const key = `${groceryItem.name.toLowerCase()}_${groceryItem.category}`;
          
          if (consolidatedItems[key]) {
            // Add quantities
            consolidatedItems[key].requiredQuantity += groceryItem.requiredQuantity || 0;
            consolidatedItems[key].needToPurchase = Math.max(
              0,
              consolidatedItems[key].requiredQuantity - consolidatedItems[key].availableAtHome
            );
            
            // Merge usage schedule
            if (groceryItem.usageSchedule) {
              consolidatedItems[key].usageSchedule = [
                ...consolidatedItems[key].usageSchedule,
                ...groceryItem.usageSchedule
              ];
            }
          } else {
            // Create new item
            consolidatedItems[key] = {
              ...groceryItem,
              id: key,
              checked: false,
              status: groceryItem.needToPurchase > 0 ? 'out_of_stock' : 'sufficient',
              priority: groceryItem.perishable ? 'high' : 'medium',
              source: 'meal_plan',
              usageSchedule: groceryItem.usageSchedule || [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
        });
      });

      // Create grocery plan
      const newPlan: Omit<GroceryPlan, 'id' | 'generatedAt'> = {
        title: `Grocery Plan (${startDate} to ${endDate})`,
        startDate,
        endDate,
        duration: 'date_range',
        includedDates: [startDate, endDate],
        groceryItems: Object.values(consolidatedItems).map(item => ({
          ...item,
          consolidatedQuantity: item.requiredQuantity,
          usageByDate: item.usageSchedule.map(schedule => ({
            date: schedule.date,
            quantity: schedule.quantity,
            meals: schedule.meals
          }))
        })),
        totalEstimatedCost: Object.values(consolidatedItems).reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
        status: 'active'
      };

      const createResponse = await groceryPlanService.create(newPlan);
      if (createResponse.success) {
        setGroceryPlan(createResponse.data!);
        setGroceryItems(Object.values(consolidatedItems));
        alert('Grocery list generated successfully!');
      } else {
        alert('Failed to create grocery plan');
      }
    } catch (error) {
      console.error('Error generating grocery list:', error);
      alert('An error occurred while generating the grocery list');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItemChecked = (itemId: string) => {
    setGroceryItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            checked: !item.checked,
            status: !item.checked ? 'purchased' : 'in_cart'
          }
        : item
    ));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setGroceryItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            tempQuantity: quantity,
            needToPurchase: Math.max(0, quantity - item.availableAtHome)
          }
        : item
    ));
  };

  const updateItemPriority = (itemId: string, priority: 'high' | 'medium' | 'low') => {
    setGroceryItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, priority } : item
    ));
  };

  const clearCompletedItems = () => {
    setGroceryItems(prev => prev.filter(item => !item.checked));
  };

  const getFilteredItems = () => {
    let filtered = groceryItems;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Filter by completion status
    if (!showCompleted) {
      filtered = filtered.filter(item => !item.checked);
    }
    
    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'category':
        default:
          return a.category.localeCompare(b.category);
      }
    });
    
    return filtered;
  };

  const getItemsByCategory = () => {
    const items = getFilteredItems();
    const grouped: { [key: string]: GroceryListItem[] } = {};
    
    items.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    return grouped;
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return priorityConfig || priorities[1]; // Default to medium
  };

  const getCompletionStats = () => {
    const total = groceryItems.length;
    const completed = groceryItems.filter(item => item.checked).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  };

  useEffect(() => {
    loadExistingPlans();
  }, [loadExistingPlans]);

  const stats = getCompletionStats();
  const filteredItems = getFilteredItems();
  const groupedItems = getItemsByCategory();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading grocery plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Smart Grocery Planning
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Generate consolidated shopping lists from your meal plans
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/hometracker/diet"
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Diet Tracker
            </Link>
          </div>
        </div>

        {/* Generation Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Generate New Grocery List
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateGroceryList}
                disabled={isGenerating}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generate List
                  </>
                )}
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will analyze all meal plans in the selected date range and create a consolidated shopping list.
          </p>
        </div>

        {/* Current Grocery List */}
        {groceryItems.length > 0 && (
          <div className="space-y-6">
            {/* Stats & Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Shopping List
                  </h2>
                  {groceryPlan && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {groceryPlan.title}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.percentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.completed} of {stats.total} completed
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'priority')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="category">Category</option>
                    <option value="name">Name</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show completed
                    </span>
                  </label>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearCompletedItems}
                    className="w-full px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Clear Completed
                  </button>
                </div>
              </div>
            </div>

            {/* Grocery Items */}
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                      {category} ({items.length} items)
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                          item.checked 
                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-75' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}>
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItemChecked(item.id)}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          
                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h4 className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                {item.name}
                              </h4>
                              
                              {/* Priority Badge */}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(item.priority).bgColor} ${getPriorityBadge(item.priority).color}`}>
                                {getPriorityBadge(item.priority).label}
                              </span>
                              
                              {item.perishable && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                  Perishable
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Need: {item.tempQuantity || item.needToPurchase} {item.unit} • 
                              Available: {item.availableAtHome} {item.unit}
                              {item.estimatedCost && ` • ~$${item.estimatedCost.toFixed(2)}`}
                            </div>
                            
                            {item.usageSchedule && item.usageSchedule.length > 0 && (
                              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                Used in: {item.usageSchedule.map(schedule => 
                                  `${schedule.date} (${schedule.meals.join(', ')})`
                                ).join('; ')}
                              </div>
                            )}
                          </div>
                          
                          {/* Quantity Input */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.tempQuantity || item.needToPurchase}
                              onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {item.unit}
                            </span>
                          </div>
                          
                          {/* Priority Selector */}
                          <select
                            value={item.priority}
                            onChange={(e) => updateItemPriority(item.id, e.target.value as 'high' | 'medium' | 'low')}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                          >
                            {priorities.map(priority => (
                              <option key={priority.value} value={priority.value}>
                                {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <span className="text-4xl">🛒</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {groceryItems.length === 0 
                    ? 'No grocery items found. Generate a list from your meal plans.' 
                    : 'No items match your current filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
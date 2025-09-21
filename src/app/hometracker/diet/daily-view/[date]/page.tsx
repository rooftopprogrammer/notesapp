'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DailyDietPlan, FamilyMember, ConsumptionEntry, MealSlot } from '@/lib/types/diet-tracker';
import { dailyDietPlanService, familyMemberService, consumptionService } from '@/lib/firebase/diet-tracker';
import { calculateCompliancePercentage } from '@/lib/utils/diet-tracker-utils';

interface MealProgress {
  meal: MealSlot;
  consumptionEntries: ConsumptionEntry[];
  completionPercentage: number;
  familyMemberProgress: Array<{
    member: FamilyMember;
    consumed: boolean;
    completionPercentage: number;
  }>;
}

export default function DailyViewPage() {
  const params = useParams();
  const date = params.date as string;
  
  const [dailyPlan, setDailyPlan] = useState<DailyDietPlan | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [mealProgress, setMealProgress] = useState<MealProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'checklist'>('timeline');

  const loadDailyData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Load daily plan
      const planResponse = await dailyDietPlanService.getByDate(date);
      if (planResponse.success && planResponse.data) {
        setDailyPlan(planResponse.data);
      }

      // Load family members
      const membersResponse = await familyMemberService.getAll();
      if (membersResponse.success && membersResponse.data) {
        setFamilyMembers(membersResponse.data);
      }

      // Load consumption entries for this date
      const consumptionResponse = await consumptionService.getByDate(date);
      const consumptionEntries = consumptionResponse.success && consumptionResponse.data 
        ? consumptionResponse.data 
        : [];

      // Calculate meal progress
      if (planResponse.success && planResponse.data && membersResponse.success && membersResponse.data) {
        const progress = planResponse.data.extractedData.meals.map(meal => {
          const mealConsumption = consumptionEntries.filter((entry: ConsumptionEntry) => entry.mealSlotId === meal.id);
          
          const familyProgress = membersResponse.data!.map(member => {
            const memberConsumption = mealConsumption.find((entry: ConsumptionEntry) => entry.familyMemberId === member.id);
            return {
              member,
              consumed: !!memberConsumption,
              completionPercentage: memberConsumption?.completionPercentage || 0
            };
          });

          const completionPercentage = calculateCompliancePercentage(
            familyProgress.filter(fp => fp.consumed).length,
            familyProgress.length
          );

          return {
            meal,
            consumptionEntries: mealConsumption,
            completionPercentage,
            familyMemberProgress: familyProgress
          };
        });

        setMealProgress(progress);
      }
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  const handleQuickConsumption = async (mealSlotId: string, memberId: string) => {
    try {
      const newEntry: Omit<ConsumptionEntry, 'id' | 'createdAt'> = {
        date,
        mealSlotId,
        familyMemberId: memberId,
        plannedItems: [], // Quick entry, detailed items can be added later
        consumedItems: [],
        completionPercentage: 100, // Quick mark as completed
        consumedAt: new Date()
      };

      const response = await consumptionService.create(newEntry);
      if (response.success) {
        await loadDailyData(); // Refresh data
      }
    } catch (error) {
      console.error('Error creating consumption entry:', error);
    }
  };

  const getMealTimeDisplay = (meal: MealSlot) => {
    return meal.timeDisplay || meal.time || 'Time not specified';
  };

  const getMealStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTimelinePosition = (meal: MealSlot) => {
    const timeStr = meal.time;
    if (!timeStr) return 0;
    
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1] || '0', 10);
    
    // Convert to percentage of day (0-100%)
    const totalMinutes = hour * 60 + minute;
    return (totalMinutes / (24 * 60)) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading daily plan...</p>
        </div>
      </div>
    );
  }

  if (!dailyPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No diet plan found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              No diet plan has been uploaded for {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <Link
              href="/hometracker/diet/meal-planning"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Upload Diet Plan
            </Link>
          </div>
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Meal Plan
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mb-6 flex items-center gap-4">
            <Link
              href="/hometracker/diet/meal-planning"
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Meal Planning
            </Link>
            
            <Link
              href={`/hometracker/diet/daily-feedback/${date}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Provide Feedback
            </Link>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex items-center justify-between">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              ⏰ Timeline View
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'checklist'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              ✅ Checklist View
            </button>
          </div>

          {/* Family Member Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View for:
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Family Members</option>
              {familyMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Daily Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Daily Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {mealProgress.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Meals
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {mealProgress.filter(mp => mp.completionPercentage >= 80).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Completed
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {mealProgress.filter(mp => mp.completionPercentage > 0 && mp.completionPercentage < 80).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  In Progress
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {mealProgress.filter(mp => mp.completionPercentage === 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pending
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(mealProgress.reduce((acc, mp) => acc + mp.completionPercentage, 0) / mealProgress.length || 0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.round(mealProgress.reduce((acc, mp) => acc + mp.completionPercentage, 0) / mealProgress.length || 0)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Meal Content */}
        {viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Meal Timeline
              </h2>

              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

                {/* Meal Items */}
                <div className="space-y-8">
                  {mealProgress
                    .sort((a, b) => getTimelinePosition(a.meal) - getTimelinePosition(b.meal))
                    .map((mealProg) => (
                    <div key={mealProg.meal.id} className="relative flex items-start gap-6">
                      {/* Timeline Dot */}
                      <div className={`relative z-10 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getMealStatusColor(mealProg.completionPercentage)}`}>
                      </div>

                      {/* Time */}
                      <div className="min-w-0 flex-1">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {mealProg.meal.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getMealTimeDisplay(mealProg.meal)}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/hometracker/diet/consumption-tracking/${date}/${mealProg.meal.id}`}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Track Consumption
                              </Link>
                              
                              <div className="text-right">
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {mealProg.completionPercentage}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  completed
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Family Portions */}
                          {mealProg.meal.familyPortions && mealProg.meal.familyPortions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Planned Portions:
                              </h4>
                              <div className="space-y-2">
                                {mealProg.meal.familyPortions.map((portion, portionIndex) => (
                                  <div key={portionIndex} className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">{portion.memberName}:</span>
                                    <span className="ml-2">
                                      {portion.items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Family Member Progress */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {mealProg.familyMemberProgress
                              .filter(fmp => selectedMember === 'all' || fmp.member.id === selectedMember)
                              .map(fmp => (
                              <div 
                                key={fmp.member.id}
                                className={`p-3 rounded-lg border ${
                                  fmp.consumed 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {fmp.member.name}
                                  </span>
                                  {fmp.consumed ? (
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickConsumption(mealProg.meal.id, fmp.member.id)}
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                    >
                                      Mark
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {fmp.member.role}
                                </div>
                                {fmp.consumed && (
                                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Completion: {Math.round(fmp.completionPercentage)}%
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Checklist View */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Meal Checklist
              </h2>

              <div className="space-y-4">
                {mealProgress.map(mealProg => (
                  <div key={mealProg.meal.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getMealStatusColor(mealProg.completionPercentage)}`}></div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {mealProg.meal.title}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {getMealTimeDisplay(mealProg.meal)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/hometracker/diet/consumption-tracking/${date}/${mealProg.meal.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Track
                        </Link>
                        
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {mealProg.completionPercentage}% complete
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {mealProg.familyMemberProgress
                        .filter(fmp => selectedMember === 'all' || fmp.member.id === selectedMember)
                        .map(fmp => (
                        <label key={fmp.member.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fmp.consumed}
                            onChange={() => {
                              if (!fmp.consumed) {
                                handleQuickConsumption(mealProg.meal.id, fmp.member.id);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {fmp.member.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
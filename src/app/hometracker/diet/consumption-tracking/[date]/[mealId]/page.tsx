'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DailyDietPlan, FamilyMember, ConsumptionEntry, MealSlot, ConsumedItem, PortionItem } from '@/lib/types/diet-tracker';
import { dailyDietPlanService, familyMemberService, consumptionService } from '@/lib/firebase/diet-tracker';
import { calculateCompliancePercentage } from '@/lib/utils/diet-tracker-utils';

interface ItemTracking {
  plannedItem: PortionItem;
  consumedItem: ConsumedItem;
  memberName: string;
  memberId: string;
}

interface FamilyConsumption {
  member: FamilyMember;
  consumptionEntry?: ConsumptionEntry;
  itemTracking: ItemTracking[];
  overallCompletion: number;
}

export default function ConsumptionTrackingPage() {
  const params = useParams();
  const date = params.date as string;
  const mealId = params.mealId as string;
  
  const [dailyPlan, setDailyPlan] = useState<DailyDietPlan | null>(null);
  const [currentMeal, setCurrentMeal] = useState<MealSlot | null>(null);
  const [familyConsumption, setFamilyConsumption] = useState<FamilyConsumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showNotes, setShowNotes] = useState<{[key: string]: boolean}>({});

  const loadConsumptionData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Load daily plan
      const planResponse = await dailyDietPlanService.getByDate(date);
      if (!planResponse.success || !planResponse.data) {
        console.error('Failed to load daily plan');
        setIsLoading(false);
        return;
      }

      const plan = planResponse.data;
      setDailyPlan(plan);

      // Find the specific meal
      const meal = plan.extractedData.meals.find(m => m.id === mealId);
      if (!meal) {
        console.error('Meal not found');
        setIsLoading(false);
        return;
      }
      setCurrentMeal(meal);

      // Load family members
      const membersResponse = await familyMemberService.getAll();
      if (!membersResponse.success || !membersResponse.data) {
        console.error('Failed to load family members');
        setIsLoading(false);
        return;
      }

      // Load existing consumption entries for this meal
      const consumptionResponse = await consumptionService.getByDate(date);
      const allConsumption = consumptionResponse.success && consumptionResponse.data 
        ? consumptionResponse.data 
        : [];

      // Build family consumption data
      const familyConsumptionData: FamilyConsumption[] = membersResponse.data.map(member => {
        const memberConsumption = allConsumption.find(
          entry => entry.familyMemberId === member.id && entry.mealSlotId === mealId
        );

        // Find planned items for this member
        const memberPortion = meal.familyPortions.find(fp => fp.memberId === member.id);
        const plannedItems = memberPortion?.items || [];

        // Build item tracking
        const itemTracking: ItemTracking[] = plannedItems.map(plannedItem => {
          const consumedItem = memberConsumption?.consumedItems.find(
            ci => ci.name === plannedItem.name
          ) || {
            name: plannedItem.name,
            plannedQuantity: `${plannedItem.quantity} ${plannedItem.unit}`,
            actualQuantity: '',
            consumed: false,
            notes: ''
          };

          return {
            plannedItem,
            consumedItem,
            memberName: member.name,
            memberId: member.id
          };
        });

        // Calculate overall completion for this member
        const completedItems = itemTracking.filter(it => it.consumedItem.consumed).length;
        const overallCompletion = calculateCompliancePercentage(completedItems, itemTracking.length);

        return {
          member,
          consumptionEntry: memberConsumption,
          itemTracking,
          overallCompletion
        };
      });

      setFamilyConsumption(familyConsumptionData);
      
      // Set first member as selected if none selected
      if (!selectedMember && membersResponse.data.length > 0) {
        setSelectedMember(membersResponse.data[0].id);
      }

    } catch (error) {
      console.error('Error loading consumption data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date, mealId, selectedMember]);

  useEffect(() => {
    loadConsumptionData();
  }, [loadConsumptionData]);

  const updateItemConsumption = (memberId: string, itemName: string, field: keyof ConsumedItem, value: string | boolean | undefined) => {
    setFamilyConsumption(prev => prev.map(fc => {
      if (fc.member.id === memberId) {
        const updatedItemTracking = fc.itemTracking.map(it => {
          if (it.plannedItem.name === itemName) {
            return {
              ...it,
              consumedItem: {
                ...it.consumedItem,
                [field]: value
              }
            };
          }
          return it;
        });

        // Recalculate completion percentage
        const completedItems = updatedItemTracking.filter(it => it.consumedItem.consumed).length;
        const overallCompletion = calculateCompliancePercentage(completedItems, updatedItemTracking.length);

        return {
          ...fc,
          itemTracking: updatedItemTracking,
          overallCompletion
        };
      }
      return fc;
    }));
  };

  const saveConsumption = async (memberId: string) => {
    setIsSaving(true);
    
    try {
      const memberConsumption = familyConsumption.find(fc => fc.member.id === memberId);
      if (!memberConsumption) return;

      const consumedItems = memberConsumption.itemTracking.map(it => it.consumedItem);
      const plannedItems = memberConsumption.itemTracking.map(it => it.plannedItem);

      const entryData: Omit<ConsumptionEntry, 'id' | 'createdAt'> = {
        date,
        mealSlotId: mealId,
        familyMemberId: memberId,
        plannedItems,
        consumedItems,
        completionPercentage: memberConsumption.overallCompletion,
        consumedAt: new Date()
      };

      let response;
      if (memberConsumption.consumptionEntry) {
        // Update existing entry
        response = await consumptionService.update(memberConsumption.consumptionEntry.id, entryData);
      } else {
        // Create new entry
        response = await consumptionService.create(entryData);
      }

      if (response.success) {
        await loadConsumptionData(); // Refresh data
        alert(`Consumption saved for ${memberConsumption.member.name}!`);
      } else {
        alert('Failed to save consumption data');
      }
    } catch (error) {
      console.error('Error saving consumption:', error);
      alert('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemConsumption = (memberId: string, itemName: string) => {
    const memberConsumption = familyConsumption.find(fc => fc.member.id === memberId);
    if (!memberConsumption) return;

    const item = memberConsumption.itemTracking.find(it => it.plannedItem.name === itemName);
    if (!item) return;

    const newConsumedValue = !item.consumedItem.consumed;
    
    // If marking as consumed and no actual quantity set, use planned quantity
    if (newConsumedValue && !item.consumedItem.actualQuantity) {
      updateItemConsumption(memberId, itemName, 'actualQuantity', item.consumedItem.plannedQuantity);
    }
    
    updateItemConsumption(memberId, itemName, 'consumed', newConsumedValue);
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const selectedMemberData = familyConsumption.find(fc => fc.member.id === selectedMember);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading consumption data...</p>
        </div>
      </div>
    );
  }

  if (!currentMeal || !dailyPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Meal not found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The requested meal could not be found for this date.
            </p>
            <Link
              href={`/hometracker/diet/daily-view/${date}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Back to Daily View
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
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Consumption Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentMeal.title} - {currentMeal.timeDisplay || currentMeal.time} on {new Date(date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/hometracker/diet/daily-view/${date}`}
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Daily View
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/hometracker/diet/meal-planning"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
            >
              Meal Planning
            </Link>
          </div>
        </div>

        {/* Family Member Selection */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Family Member Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {familyConsumption.map(fc => (
                <button
                  key={fc.member.id}
                  onClick={() => setSelectedMember(fc.member.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedMember === fc.member.id
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {fc.member.name}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCompletionColor(fc.overallCompletion)}`}>
                      {fc.overallCompletion}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {fc.member.role}
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fc.overallCompletion}%` }}
                    ></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Consumption Tracking */}
        {selectedMemberData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedMemberData.member.name}&apos;s Consumption
                </h2>
                <button
                  onClick={() => saveConsumption(selectedMemberData.member.id)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </button>
              </div>

              {/* Items Tracking */}
              <div className="space-y-4">
                {selectedMemberData.itemTracking.map((itemTrack, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 ${
                      itemTrack.consumedItem.consumed 
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleItemConsumption(selectedMemberData.member.id, itemTrack.plannedItem.name)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            itemTrack.consumedItem.consumed
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                          }`}
                        >
                          {itemTrack.consumedItem.consumed && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {itemTrack.plannedItem.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Planned: {itemTrack.plannedItem.quantity} {itemTrack.plannedItem.unit}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowNotes(prev => ({
                          ...prev,
                          [`${selectedMemberData.member.id}-${itemTrack.plannedItem.name}`]: !prev[`${selectedMemberData.member.id}-${itemTrack.plannedItem.name}`]
                        }))}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                        </svg>
                      </button>
                    </div>

                    {/* Actual Quantity Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Actual Quantity Consumed
                        </label>
                        <input
                          type="text"
                          value={itemTrack.consumedItem.actualQuantity}
                          onChange={(e) => updateItemConsumption(
                            selectedMemberData.member.id, 
                            itemTrack.plannedItem.name, 
                            'actualQuantity', 
                            e.target.value
                          )}
                          placeholder={`e.g., ${itemTrack.plannedItem.quantity} ${itemTrack.plannedItem.unit}`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Waste Reason (if applicable)
                        </label>
                        <select
                          value={itemTrack.consumedItem.wasteReason || ''}
                          onChange={(e) => updateItemConsumption(
                            selectedMemberData.member.id, 
                            itemTrack.plannedItem.name, 
                            'wasteReason', 
                            e.target.value || undefined
                          )}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">No waste</option>
                          <option value="too_much">Too much quantity</option>
                          <option value="didnt_like">Didn&apos;t like taste</option>
                          <option value="too_spicy">Too spicy</option>
                          <option value="too_sweet">Too sweet</option>
                          <option value="not_hungry">Not hungry</option>
                          <option value="medical_reason">Medical reason</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {showNotes[`${selectedMemberData.member.id}-${itemTrack.plannedItem.name}`] && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={itemTrack.consumedItem.notes || ''}
                          onChange={(e) => updateItemConsumption(
                            selectedMemberData.member.id, 
                            itemTrack.plannedItem.name, 
                            'notes', 
                            e.target.value
                          )}
                          placeholder="Add any notes about this item..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Consumption Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                    <span className="ml-2 font-medium">{selectedMemberData.itemTracking.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Consumed:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {selectedMemberData.itemTracking.filter(it => it.consumedItem.consumed).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      {selectedMemberData.itemTracking.filter(it => !it.consumedItem.consumed).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Completion:</span>
                    <span className={`ml-2 font-medium ${getCompletionColor(selectedMemberData.overallCompletion).split(' ')[0]}`}>
                      {selectedMemberData.overallCompletion}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
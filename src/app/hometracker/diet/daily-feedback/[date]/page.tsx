'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DailyDietPlan, FamilyMember, DailyFeedback } from '@/lib/types/diet-tracker';
import { dailyDietPlanService, familyMemberService, feedbackService } from '@/lib/firebase/diet-tracker';

interface MealRating {
  mealId: string;
  mealTitle: string;
  rating: number;
  taste: number;
  satisfaction: number;
  portions: number;
  notes: string;
}

interface FamilyMemberFeedback {
  member: FamilyMember;
  mealRatings: MealRating[];
  overallDayRating: number;
  energyLevel: number;
  cravings: string[];
  suggestions: string;
  wouldRepeat: boolean;
}

export default function DailyFeedbackPage() {
  const params = useParams();
  const date = params.date as string;
  
  const [dailyPlan, setDailyPlan] = useState<DailyDietPlan | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [feedback, setFeedback] = useState<DailyFeedback | null>(null);
  const [familyFeedback, setFamilyFeedback] = useState<FamilyMemberFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'individual' | 'summary'>('individual');

  const cravingOptions = [
    'Sweet treats', 'Salty snacks', 'Spicy food', 'Fried food', 
    'Cold drinks', 'Hot beverages', 'Fruits', 'Dairy products',
    'Meat/Protein', 'Carbs/Bread', 'None'
  ];

  const loadData = useCallback(async () => {
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
        if (membersResponse.data.length > 0 && !selectedMember) {
          setSelectedMember(membersResponse.data[0].id);
        }
      }
      
      // Load existing feedback
      const feedbackResponse = await feedbackService.getByDate(date);
      if (feedbackResponse.success && feedbackResponse.data) {
        setFeedback(feedbackResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date, selectedMember]);

  const initializeFamilyFeedback = useCallback(() => {
    if (!familyMembers.length || !dailyPlan) return;
    
    const initialFeedback: FamilyMemberFeedback[] = familyMembers.map(member => ({
      member,
      mealRatings: dailyPlan.extractedData.meals.map(meal => ({
        mealId: meal.id,
        mealTitle: meal.title,
        rating: 0,
        taste: 0,
        satisfaction: 0,
        portions: 0,
        notes: ''
      })),
      overallDayRating: 0,
      energyLevel: 0,
      cravings: [],
      suggestions: '',
      wouldRepeat: false
    }));
    
    setFamilyFeedback(initialFeedback);
  }, [familyMembers, dailyPlan]);

  const updateMemberFeedback = (memberId: string, updates: Partial<FamilyMemberFeedback>) => {
    setFamilyFeedback(prev => prev.map(ff => 
      ff.member.id === memberId ? { ...ff, ...updates } : ff
    ));
  };

  const updateMealRating = (memberId: string, mealId: string, updates: Partial<MealRating>) => {
    setFamilyFeedback(prev => prev.map(ff => 
      ff.member.id === memberId ? {
        ...ff,
        mealRatings: ff.mealRatings.map(mr => 
          mr.mealId === mealId ? { ...mr, ...updates } : mr
        )
      } : ff
    ));
  };

  const toggleCraving = (memberId: string, craving: string) => {
    setFamilyFeedback(prev => prev.map(ff => 
      ff.member.id === memberId ? {
        ...ff,
        cravings: ff.cravings.includes(craving)
          ? ff.cravings.filter(c => c !== craving)
          : [...ff.cravings, craving]
      } : ff
    ));
  };

  const saveFeedback = async () => {
    if (!dailyPlan) return;
    
    setIsSaving(true);
    
    try {
      const feedbackData: Omit<DailyFeedback, 'id' | 'createdAt'> = {
        date,
        familyFeedback: familyFeedback.map(ff => ({
          memberId: ff.member.id,
          memberName: ff.member.name,
          overallDayRating: ff.overallDayRating,
          energyLevel: ff.energyLevel,
          cravings: ff.cravings,
          suggestions: ff.suggestions,
          wouldRepeatDay: ff.wouldRepeat,
          mealFeedback: ff.mealRatings.map(mr => ({
            mealId: mr.mealId,
            mealTitle: mr.mealTitle,
            overallRating: mr.rating,
            tasteRating: mr.taste,
            satisfactionRating: mr.satisfaction,
            portionRating: mr.portions,
            notes: mr.notes
          }))
        })),
        summary: {
          averageRating: familyFeedback.reduce((acc, ff) => acc + ff.overallDayRating, 0) / familyFeedback.length,
          commonCravings: getMostCommonCravings(),
          topRatedMeals: getTopRatedMeals(),
          improvementAreas: getImprovementAreas()
        },
        updatedAt: new Date()
      };
      
      const response = await feedbackService.createOrUpdate(feedbackData);
      if (response.success) {
        setFeedback(response.data!);
        alert('Feedback saved successfully!');
      } else {
        alert('Failed to save feedback');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('An error occurred while saving feedback');
    } finally {
      setIsSaving(false);
    }
  };

  const getMostCommonCravings = (): string[] => {
    const cravingCounts: { [key: string]: number } = {};
    familyFeedback.forEach(ff => {
      ff.cravings.forEach(craving => {
        cravingCounts[craving] = (cravingCounts[craving] || 0) + 1;
      });
    });
    
    return Object.entries(cravingCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([craving]) => craving);
  };

  const getTopRatedMeals = (): Array<{ mealTitle: string; averageRating: number }> => {
    if (!dailyPlan) return [];
    
    const mealRatings: { [key: string]: number[] } = {};
    familyFeedback.forEach(ff => {
      ff.mealRatings.forEach(mr => {
        if (!mealRatings[mr.mealTitle]) mealRatings[mr.mealTitle] = [];
        mealRatings[mr.mealTitle].push(mr.rating);
      });
    });
    
    return Object.entries(mealRatings)
      .map(([title, ratings]) => ({
        mealTitle: title,
        averageRating: ratings.reduce((a, b) => a + b, 0) / ratings.length
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 3);
  };

  const getImprovementAreas = (): string[] => {
    const suggestions = familyFeedback
      .map(ff => ff.suggestions)
      .filter(s => s.trim().length > 0);
    
    return suggestions.slice(0, 5);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const StarRating = ({ rating, onRatingChange, label }: { 
    rating: number; 
    onRatingChange: (rating: number) => void; 
    label: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
        {label}:
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onRatingChange(star)}
            className={`w-6 h-6 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 dark:text-gray-600'
            } hover:text-yellow-400 transition-colors`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        ))}
        <span className={`ml-2 text-sm font-medium ${getRatingColor(rating)}`}>
          {rating > 0 ? rating : '-'}
        </span>
      </div>
    </div>
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (familyMembers.length > 0 && dailyPlan && familyFeedback.length === 0 && !feedback) {
      initializeFamilyFeedback();
    } else if (feedback && familyMembers.length > 0 && dailyPlan && familyFeedback.length === 0) {
      // Initialize from existing feedback
      const initialFeedback: FamilyMemberFeedback[] = familyMembers.map(member => {
        const memberFeedback = feedback.familyFeedback.find(f => f.memberId === member.id);
        
        return {
          member,
          mealRatings: dailyPlan.extractedData.meals.map(meal => {
            const mealFeedback = memberFeedback?.mealFeedback.find(m => m.mealId === meal.id);
            return {
              mealId: meal.id,
              mealTitle: meal.title,
              rating: mealFeedback?.overallRating || 0,
              taste: mealFeedback?.tasteRating || 0,
              satisfaction: mealFeedback?.satisfactionRating || 0,
              portions: mealFeedback?.portionRating || 0,
              notes: mealFeedback?.notes || ''
            };
          }),
          overallDayRating: memberFeedback?.overallDayRating || 0,
          energyLevel: memberFeedback?.energyLevel || 0,
          cravings: memberFeedback?.cravings || [],
          suggestions: memberFeedback?.suggestions || '',
          wouldRepeat: memberFeedback?.wouldRepeatDay || false
        };
      });
      
      setFamilyFeedback(initialFeedback);
    }
  }, [familyMembers, dailyPlan, feedback, familyFeedback.length, initializeFamilyFeedback]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (!dailyPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg inline-block mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Diet Plan Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No diet plan exists for {new Date(date).toLocaleDateString()}. Create a plan first to provide feedback.
          </p>
          <Link
            href="/hometracker/diet/meal-planning"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            Create Diet Plan
          </Link>
        </div>
      </div>
    );
  }

  const currentMemberFeedback = familyFeedback.find(ff => ff.member.id === selectedMember);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Feedback
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

          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/hometracker/diet/daily-view/${date}`}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Daily View
            </Link>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('individual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'individual'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Individual Feedback
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Family Summary
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'individual' ? (
          <div className="space-y-6">
            {/* Family Member Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Family Member
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {familyMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member.id)}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedMember === member.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {member.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Feedback Form */}
            {currentMemberFeedback && (
              <div className="space-y-6">
                {/* Meal Ratings */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Meal Ratings for {currentMemberFeedback.member.name}
                  </h2>
                  
                  <div className="space-y-6">
                    {currentMemberFeedback.mealRatings.map(mealRating => (
                      <div key={mealRating.mealId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                          {mealRating.mealTitle}
                        </h3>
                        
                        <div className="space-y-3">
                          <StarRating
                            rating={mealRating.rating}
                            onRatingChange={(rating) => updateMealRating(selectedMember, mealRating.mealId, { rating })}
                            label="Overall"
                          />
                          
                          <StarRating
                            rating={mealRating.taste}
                            onRatingChange={(taste) => updateMealRating(selectedMember, mealRating.mealId, { taste })}
                            label="Taste"
                          />
                          
                          <StarRating
                            rating={mealRating.satisfaction}
                            onRatingChange={(satisfaction) => updateMealRating(selectedMember, mealRating.mealId, { satisfaction })}
                            label="Satisfaction"
                          />
                          
                          <StarRating
                            rating={mealRating.portions}
                            onRatingChange={(portions) => updateMealRating(selectedMember, mealRating.mealId, { portions })}
                            label="Portions"
                          />
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Notes:
                            </label>
                            <textarea
                              value={mealRating.notes}
                              onChange={(e) => updateMealRating(selectedMember, mealRating.mealId, { notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                              rows={2}
                              placeholder="Any specific comments about this meal..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Day Feedback */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Overall Day Feedback
                  </h2>
                  
                  <div className="space-y-6">
                    <StarRating
                      rating={currentMemberFeedback.overallDayRating}
                      onRatingChange={(overallDayRating) => updateMemberFeedback(selectedMember, { overallDayRating })}
                      label="Overall Day"
                    />
                    
                    <StarRating
                      rating={currentMemberFeedback.energyLevel}
                      onRatingChange={(energyLevel) => updateMemberFeedback(selectedMember, { energyLevel })}
                      label="Energy Level"
                    />
                    
                    {/* Cravings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Cravings experienced today:
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cravingOptions.map(craving => (
                          <button
                            key={craving}
                            onClick={() => toggleCraving(selectedMember, craving)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                              currentMemberFeedback.cravings.includes(craving)
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            {craving}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Suggestions for improvement:
                      </label>
                      <textarea
                        value={currentMemberFeedback.suggestions}
                        onChange={(e) => updateMemberFeedback(selectedMember, { suggestions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="What would make tomorrow&apos;s meal plan better?"
                      />
                    </div>
                    
                    {/* Would Repeat */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`repeat-${selectedMember}`}
                        checked={currentMemberFeedback.wouldRepeat}
                        onChange={(e) => updateMemberFeedback(selectedMember, { wouldRepeat: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor={`repeat-${selectedMember}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Would repeat this diet plan
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Family Summary */
          <div className="space-y-6">
            {feedback && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Average Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {feedback.summary.averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Average Day Rating
                    </div>
                  </div>
                </div>
                
                {/* Common Cravings */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Common Cravings
                  </h3>
                  <div className="space-y-2">
                    {feedback.summary.commonCravings.map(craving => (
                      <div key={craving} className="text-sm text-gray-600 dark:text-gray-400">
                        • {craving}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Top Rated Meals */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Top Rated Meals
                  </h3>
                  <div className="space-y-2">
                    {feedback.summary.topRatedMeals.map(meal => (
                      <div key={meal.mealTitle} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{meal.mealTitle}</span>
                        <span className={`font-medium ${getRatingColor(meal.averageRating)}`}>
                          {meal.averageRating.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Improvement Areas */}
            {feedback && feedback.summary.improvementAreas.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Improvement Suggestions
                </h3>
                <div className="space-y-2">
                  {feedback.summary.improvementAreas.map((suggestion, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveFeedback}
            disabled={isSaving}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
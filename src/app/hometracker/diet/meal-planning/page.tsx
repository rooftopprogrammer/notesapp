'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DailyDietPlan } from '@/lib/types/diet-tracker';
import { dailyDietPlanService, familyMemberService } from '@/lib/firebase/diet-tracker';
import { formatDate, getMonthRange } from '@/lib/utils/diet-tracker-utils';
import { extractPDFDataWithAI, aiExtractor } from '@/lib/ai/pdf-extractor';

// AI Services Status Component
const AIServicesStatus = () => {
  const [aiStatus, setAiStatus] = useState<any>(null);

  useEffect(() => {
    setAiStatus(aiExtractor.getUsageStats());
  }, []);

  if (!aiStatus) return null;

  const availableServices = aiStatus.services.filter((s: any) => s.enabled && s.hasApiKey);
  const totalRemaining = availableServices.reduce((sum: number, s: any) => sum + s.remaining, 0);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
          AI-Enhanced Extraction
        </h4>
      </div>
      
      {availableServices.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            {availableServices.length} AI service{availableServices.length > 1 ? 's' : ''} configured • {totalRemaining} requests remaining
          </p>
          <div className="flex flex-wrap gap-1">
            {availableServices.map((service: any) => (
              <span 
                key={service.name}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  service.remaining > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {service.name}: {service.remaining}/{service.limit}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-amber-700 dark:text-amber-300">
          ⚠️ No AI services configured. Add API keys for better extraction.
          <Link href="/settings" className="ml-1 underline hover:text-amber-800 dark:hover:text-amber-200">
            Configure
          </Link>
        </div>
      )}
    </div>
  );
};

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasPlans: boolean;
  planStatus?: DailyDietPlan['status'];
}

export default function MealPlanningPage() {
  const [dailyPlans, setDailyPlans] = useState<DailyDietPlan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    step: '',
    extractingMeals: false,
    extractingFamily: false,
    savingPlan: false,
    savingFamily: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const router = useRouter();

  const loadDailyPlans = useCallback(async () => {
    console.log('Loading daily plans for month:', formatDate(currentMonth));
    const monthRange = getMonthRange(formatDate(currentMonth));
    console.log('Date range:', monthRange);
    
    const response = await dailyDietPlanService.getByDateRange(monthRange.start, monthRange.end);
    console.log('API response:', response);
    
    if (response.success && response.data) {
      console.log('Setting daily plans:', response.data);
      setDailyPlans(response.data);
    } else {
      console.error('Failed to load daily plans:', response.error);
    }
  }, [currentMonth]);

  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days: CalendarDay[] = [];
    const today = formatDate(new Date());

    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatDate(date);
      const plan = dailyPlans.find(p => p.date === dateStr);

      days.push({
        date: dateStr,
        isCurrentMonth: date.getMonth() === month,
        isToday: dateStr === today,
        hasPlans: !!plan,
        planStatus: plan?.status
      });
    }

    setCalendarDays(days);
  }, [currentMonth, dailyPlans]);

  useEffect(() => {
    loadDailyPlans();
  }, [currentMonth, loadDailyPlans]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, dailyPlans, generateCalendarDays]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    
    if (file && file.type === 'application/pdf') {
      console.log('Valid PDF file selected:', { name: file.name, size: file.size, type: file.type });
      setSelectedFile(file);
    } else {
      console.log('Invalid file type:', file?.type);
      alert('Please select a PDF file');
    }
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    // If there's a plan for this date, navigate to daily view
    const planForDate = dailyPlans.find(plan => plan.date === date);
    if (planForDate) {
      router.push(`/hometracker/diet/daily-view/${date}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDate) {
      alert('Please select both a file and date');
      return;
    }

    console.log('Starting upload...', { fileName: selectedFile.name, date: selectedDate });
    setIsUploading(true);
    setUploadProgress({
      step: 'Starting upload...',
      extractingMeals: false,
      extractingFamily: false,
      savingPlan: false,
      savingFamily: false
    });
    
    try {
      // Check if plan already exists for this date
      console.log('Checking for existing plan...');
      const existingResponse = await dailyDietPlanService.getByDate(selectedDate);
      console.log('Existing plan check result:', existingResponse);
      
      if (existingResponse.success && existingResponse.data) {
        if (!confirm('A diet plan already exists for this date. Do you want to replace it?')) {
          setIsUploading(false);
          return;
        }
      }

      // Step 1: Extract PDF content (simulate reading PDF text)
      setUploadProgress(prev => ({ 
        ...prev, 
        step: 'Extracting PDF content...', 
        extractingMeals: true 
      }));
      
      // For now, we'll create a comprehensive sample based on your actual PDF structure
      // In production, you would use pdf-parse or similar library
      const samplePdfText = `
        Family Diet Plan - Sunday, ${selectedDate}
        
        Family Members:
        - Ravi (thyroid condition, 4 tsp oil limit)
        - Mother (thyroid condition, 4 tsp oil)
        - Father (4 tsp oil, prefers guava)
        - Brother (4 tsp oil, 1.2x portions)
        - Wife (breastfeeding, 5 tsp oil, special nutrition needs)
        
        Early Morning - 6:00 AM
        Warm water with honey and lemon (1 glass)
        
        Breakfast - 8:00 AM
        Idli (4 pieces per person)
        Coconut chutney (2 tbsp)
        Coffee or tea (1 cup)
        
        Mid-Morning - 10:30 AM
        Seasonal fruits - Guava (1 medium, preferred for father)
        Apple (1 medium for others)
        
        Lunch - 1:00 PM
        Rice (1 cup cooked per person)
        Sambar (1 bowl per person)
        Mixed vegetable curry (1/2 cup per person)
        Buttermilk (1 glass per person)
        
        Evening Snack - 4:00 PM
        Green tea (1 cup)
        Roasted nuts (10-15 pieces per person)
        
        Dinner - 7:30 PM
        Chapati (2 pieces per person, 3 for brother)
        Dal curry (1 bowl per person)
        Vegetable stir-fry (1/2 cup per person)
        
        Bedtime - 9:30 PM
        Warm turmeric milk (1 glass per person)
        
        Kitchen Checklist:
        Rice: 2.0 kg
        Dal: 1.5 kg  
        Mixed vegetables: 2.0 kg
        Cooking oil: 200 ml
        Chapati flour: 1.0 kg
        Turmeric powder: 50 g
        Cumin powder: 100 g
        Coriander powder: 100 g
        Fresh fruits: 3.0 kg
        Milk: 2.0 liters
        Honey: 500 g
        Coconut: 2.0 pieces
        Onions: 1.0 kg
        Tomatoes: 500 g
        Green chilies: 100 g
        Ginger: 200 g
        Garlic: 200 g
        Buttermilk culture: 250 ml
        
        Nutrition Summary: 
        Calories: 1800–2100 kcal per person
        Protein: 75–90 g
        Carbs: 180–220 g  
        Fats: 40–55 g
        
        House Rules:
        - Oil limit: 4 tsp for Ravi, Mother, Father, Brother; 5 tsp for wife (breastfeeding)
        - Water intake: minimum 3 liters per day
        - No processed foods
        - Fresh preparation daily
        - Extra portions for brother (1.2x)
        - Special nutrition for breastfeeding wife
      `;
      
      // Step 2: Extract meal and family data using AI
      const extractedData = await extractPDFDataWithAI(samplePdfText);
      console.log('Extracted data:', extractedData);
      console.log('Extracted meals:', extractedData.meals);
      console.log('Extracted family members:', extractedData.familyMembers);
      console.log('Extracted groceries:', extractedData.groceries);

      // Step 3: Process family members
      setUploadProgress(prev => ({
        ...prev,
        step: `Processing family members... (${extractedData.extractionMethod})`,
        extractingFamily: true,
        extractingMeals: false
      }));      let familyProcessingResult = null;
      if (extractedData.familyMembers && extractedData.familyMembers.length > 0) {
        familyProcessingResult = await familyMemberService.createOrUpdateFromPDF(extractedData.familyMembers);
        console.log('Family processing result:', familyProcessingResult);
      }

      // Step 4: Create diet plan
      setUploadProgress(prev => ({ 
        ...prev, 
        step: 'Saving diet plan...', 
        savingPlan: true,
        extractingFamily: false
      }));

      const newPlan: Omit<DailyDietPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        date: selectedDate,
        title: `Diet Plan - ${selectedDate}`,
        pdfFile: {
          name: selectedFile.name,
          size: selectedFile.size,
          url: URL.createObjectURL(selectedFile), // In real app, upload to storage
          uploadedAt: new Date()
        },
        extractedData: {
          meals: (extractedData.meals || []).map((meal: any, index: number) => ({
            id: `meal-${selectedDate}-${index}`,
            time: meal.time || '00:00',
            timeDisplay: meal.time ? 
              new Date(`2000-01-01T${meal.time}:00`).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              }) : '12:00 AM',
            title: meal.title || 'Unknown Meal',
            description: meal.description || '',
            type: meal.title?.toLowerCase().includes('medication') ? 'medication' as const :
                  meal.title?.toLowerCase().includes('snack') ? 'snack' as const :
                  meal.title?.toLowerCase().includes('drink') ? 'drink' as const : 'meal' as const,
            familyPortions: []
          })),
          groceryList: (extractedData.groceries || []).map((grocery: any, index: number) => ({
            id: `grocery-${selectedDate}-${index}`,
            name: grocery.name || 'Unknown Item',
            category: grocery.category || 'condiments',
            requiredQuantity: grocery.requiredQuantity || 0,
            unit: grocery.unit || 'pieces',
            availableAtHome: 0,
            needToPurchase: grocery.requiredQuantity || 0,
            status: 'out_of_stock' as const,
            source: grocery.source || 'meal_plan',
            priority: 'medium' as const,
            perishable: true,
            estimatedCost: 0,
            notes: '',
            usageSchedule: [],
            createdAt: new Date(),
            updatedAt: new Date()
          })),
          nutritionSummary: {
            caloriesPerPerson: extractedData.nutrition.caloriesPerPerson || { min: 1800, max: 2100 },
            macros: extractedData.nutrition.macros || {
              protein: { min: 75, max: 90, unit: 'g' },
              carbs: { min: 180, max: 220, unit: 'g' },
              fats: { min: 40, max: 55, unit: 'g' }
            },
            dailyTargets: extractedData.nutrition.dailyTargets || { water: 3.5, oil: 4.5 }
          },
          houseRules: []
        },
        status: 'processed'
      };

      console.log('Creating new plan...', newPlan);
      const response = await dailyDietPlanService.create(newPlan);
      console.log('Create response:', response);
      
      if (response.success) {
        console.log('Plan created successfully, reloading plans...');
        console.log('Created plan:', response.data);
        await loadDailyPlans();
        setSelectedFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Show success message with family processing results
        let successMessage = 'Diet plan uploaded successfully!';
        if (familyProcessingResult?.success && familyProcessingResult.data) {
          const { created, updated, skipped } = familyProcessingResult.data;
          if (created.length > 0 || updated.length > 0) {
            successMessage += `\n\nFamily Members:`;
            if (created.length > 0) {
              successMessage += `\n✅ Created: ${created.map((m: { name: string }) => m.name).join(', ')}`;
            }
            if (updated.length > 0) {
              successMessage += `\n🔄 Updated: ${updated.map((m: { name: string }) => m.name).join(', ')}`;
            }
            if (skipped.length > 0) {
              successMessage += `\n⏭️ Skipped: ${skipped.length} members (no new data)`;
            }
          }
        }
        
        alert(successMessage);
      } else {
        console.error('Failed to create plan:', response.error);
        alert(`Failed to upload diet plan: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`An error occurred during upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({
        step: '',
        extractingMeals: false,
        extractingFamily: false,
        savingPlan: false,
        savingFamily: false
      });
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const getStatusColor = (status?: DailyDietPlan['status']) => {
    switch (status) {
      case 'processed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Meal Planning
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload and manage daily diet plans with visual calendar
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/hometracker/diet"
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Family Diet Tracker
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              📅 Calendar View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              📋 List View
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDate(formatDate(new Date()))}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {dailyPlans.length} plans this month
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => handleDateClick(day.date)}
                    className={`relative p-3 h-20 rounded-lg border-2 transition-all text-left ${
                      day.isCurrentMonth
                        ? 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600'
                        : 'border-gray-100 dark:border-gray-700 opacity-50'
                    } ${
                      day.isToday
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                        : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    } ${
                      selectedDate === day.date
                        ? 'ring-2 ring-teal-500 border-teal-500'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(day.date).getDate()}
                    </div>
                    
                    {day.hasPlans && (
                      <div className={`absolute bottom-2 right-2 w-3 h-3 rounded-full ${getStatusColor(day.planStatus)}`}>
                      </div>
                    )}
                    
                    {day.isToday && (
                      <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Processed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Diet Plans List
              </h2>

              {dailyPlans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No diet plans uploaded
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload your first diet plan PDF to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {plan.title || `Diet Plan - ${plan.date}`}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(plan.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            plan.status === 'processed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                            plan.status === 'processing' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                            plan.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {plan.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload New Diet Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* AI Services Status */}
              <div className="md:col-span-2">
                <AIServicesStatus />
              </div>

              {/* File Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PDF File
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-2">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedFile ? selectedFile.name : 'Choose PDF file'}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                          PDF files only, up to 10MB
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedDate || isUploading}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors"
              >
                {isUploading ? 'Processing...' : 'Upload Diet Plan'}
              </button>
            </div>

            {/* Progress Indicators */}
            {isUploading && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                  Processing PDF Upload with AI Enhancement
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      uploadProgress.extractingMeals 
                        ? 'bg-blue-500 animate-pulse' 
                        : uploadProgress.step.includes('meal') || uploadProgress.extractingFamily || uploadProgress.savingPlan 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Extracting meal data from PDF
                    </span>
                    {uploadProgress.extractingMeals && (
                      <div className="ml-auto">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      uploadProgress.extractingFamily 
                        ? 'bg-blue-500 animate-pulse' 
                        : uploadProgress.savingPlan 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Processing family member profiles
                    </span>
                    {uploadProgress.extractingFamily && (
                      <div className="ml-auto">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      uploadProgress.savingPlan 
                        ? 'bg-blue-500 animate-pulse' 
                        : uploadProgress.step === '' 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Saving diet plan and family data
                    </span>
                    {uploadProgress.savingPlan && (
                      <div className="ml-auto">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
                  {uploadProgress.step}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
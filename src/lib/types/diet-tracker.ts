// Core types for the Family Diet Tracker system

export interface FamilyMember {
  id: string;
  name: string;
  role: 'father' | 'mother' | 'brother' | 'wife_bf' | 'pregnant_sil' | 'ravi';
  age: number;
  medicalConditions: string[];
  dietaryRestrictions: string[];
  portionMultiplier: number; // 1.0 = normal, 1.2 = 20% more, etc.
  waterIntakeTarget: number; // in liters (3-3.5L etc)
  oilLimit: number; // in teaspoons (4-5 tsp)
  avatar?: string;
  preferences: {
    favoriteFruits: string[];
    dislikedFoods: string[];
    allergies: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyDietPlan {
  id: string;
  date: string; // "2025-09-21"
  title?: string; // "Sunday Family Diet Plan"
  pdfFile?: {
    name: string;
    size: number;
    url: string;
    uploadedAt: Date;
  };
  extractedData: {
    meals: MealSlot[];
    groceryList: GroceryItem[];
    nutritionSummary: NutritionSummary;
    houseRules: HouseRule[];
  };
  status: 'uploaded' | 'processing' | 'processed' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface MealSlot {
  id: string;
  time: string; // "06:30"
  timeDisplay: string; // "6:30 AM"
  title: string; // "Early Morning"
  description?: string; // "Medication and hydration"
  type: 'medication' | 'meal' | 'snack' | 'drink';
  familyPortions: FamilyPortion[];
  totalPreparationTime?: number; // in minutes
  cookingInstructions?: string[];
  nutritionPerServing?: NutritionInfo;
}

export interface FamilyPortion {
  memberId: string;
  memberName: string;
  items: PortionItem[];
  specialInstructions?: string;
  totalCalories?: number;
}

export interface PortionItem {
  name: string;
  quantity: string;
  unit: string;
  calories?: number;
  notes?: string;
}

export interface ConsumptionEntry {
  id: string;
  date: string;
  mealSlotId: string;
  familyMemberId: string;
  plannedItems: PortionItem[];
  consumedItems: ConsumedItem[];
  completionPercentage: number;
  consumedAt?: Date;
  skippedReason?: string;
  createdAt: Date;
}

export interface ConsumedItem {
  name: string;
  plannedQuantity: string;
  actualQuantity: string;
  consumed: boolean;
  notes?: string;
  wasteReason?: string;
}

export interface DailyFeedback {
  id: string;
  date: string;
  familyFeedback: FamilyMemberFeedback[];
  summary: FeedbackSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMemberFeedback {
  memberId: string;
  memberName: string;
  overallDayRating: number; // 1-5 stars
  energyLevel: number; // 1-5
  cravings: string[];
  suggestions: string;
  wouldRepeatDay: boolean;
  mealFeedback: MealFeedback[];
}

export interface MealFeedback {
  mealId: string;
  mealTitle: string;
  overallRating: number; // 1-5 stars
  tasteRating: number; // 1-5
  satisfactionRating: number; // 1-5
  portionRating: number; // 1-5
  notes: string;
}

export interface FeedbackSummary {
  averageRating: number;
  commonCravings: string[];
  topRatedMeals: Array<{ mealTitle: string; averageRating: number }>;
  improvementAreas: string[];
}

export interface GroceryItem {
  id: string;
  name: string;
  category: 'grains' | 'vegetables' | 'proteins' | 'dairy' | 'spices' | 'fruits' | 'nuts' | 'condiments';
  requiredQuantity: number;
  availableAtHome: number;
  unit: string;
  needToPurchase: number;
  status: 'sufficient' | 'low' | 'out_of_stock' | 'purchased' | 'in_cart';
  priority: 'high' | 'medium' | 'low';
  perishable: boolean;
  expiryDate?: Date;
  estimatedCost?: number;
  vendor?: string;
  lastPurchased?: Date;
  source: 'meal_plan' | 'manual' | 'auto_generated';
  usageSchedule: {
    date: string;
    meals: string[];
    quantity: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryPlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: 'single_day' | 'date_range' | 'week' | 'month';
  includedDates: string[];
  groceryItems: SmartGroceryItem[];
  totalEstimatedCost: number;
  actualCost?: number;
  status: 'draft' | 'active' | 'shopping' | 'completed';
  generatedAt: Date;
  completedAt?: Date;
}

export interface SmartGroceryItem extends GroceryItem {
  consolidatedQuantity: number; // total across all days
  usageByDate: {
    date: string;
    quantity: number;
    meals: string[];
  }[];
  bulkDiscount?: number;
  alternatives?: string[];
}

export interface NutritionSummary {
  caloriesPerPerson: {
    min: number;
    max: number;
  };
  macros: {
    protein: { min: number; max: number; unit: 'g' };
    carbs: { min: number; max: number; unit: 'g' };
    fats: { min: number; max: number; unit: 'g' };
  };
  dailyTargets: {
    water: number; // liters
    oil: number; // teaspoons
  };
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sodium?: number;
}

export interface HouseRule {
  id: string;
  category: 'oil' | 'water' | 'medication' | 'plate_rule' | 'timing';
  title: string;
  description: string;
  appliesTo: string[]; // family member IDs
  value?: number;
  unit?: string;
}

export interface ConsumptionAnalytics {
  date: string;
  familyMemberId?: string;
  totalMeals: number;
  completedMeals: number;
  skippedMeals: number;
  compliancePercentage: number;
  averageRating: number;
  totalCaloriesConsumed: number;
  waterIntakeCompliance: number;
  oilConsumptionCompliance: number;
  commonSkipReasons: string[];
  favoredMealTimes: string[];
  nutritionGoalsMetPercentage: number;
}

export interface FeedbackAnalytics {
  dateRange: { start: string; end: string };
  familyMemberId?: string;
  averageOverallRating: number;
  averageEnergyLevel: number;
  averageSatisfaction: number;
  topRatedMeals: {
    mealTitle: string;
    averageRating: number;
    frequency: number;
  }[];
  lowestRatedMeals: {
    mealTitle: string;
    averageRating: number;
    frequency: number;
  }[];
  commonCravings: string[];
  frequentSideEffects: string[];
  moodTrends: {
    date: string;
    mood: string;
    rating: number;
  }[];
  improvementSuggestions: string[];
}

export interface GroceryAnalytics {
  dateRange: { start: string; end: string };
  totalSpent: number;
  totalWasted: number;
  wastePercentage: number;
  mostWastedItems: {
    name: string;
    wastedQuantity: number;
    wastedValue: number;
  }[];
  costEfficiencyByCategory: {
    category: string;
    averageCost: number;
    priceVariation: number;
  }[];
  bulkSavings: number;
  seasonalPriceChanges: {
    item: string;
    priceChange: number;
    reason: string;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Filter and search types
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface FamilyMemberFilter {
  memberIds?: string[];
  roles?: FamilyMember['role'][];
  medicalConditions?: string[];
}

export interface MealFilter {
  mealTypes?: MealSlot['type'][];
  timeRange?: {
    start: string; // "06:00"
    end: string;   // "22:00"
  };
  minRating?: number;
  maxRating?: number;
}

export interface GroceryFilter {
  categories?: GroceryItem['category'][];
  status?: GroceryItem['status'][];
  perishableOnly?: boolean;
  needToPurchaseOnly?: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
}
// Utility functions for the Diet Tracker system
import { 
  FamilyMember, 
  MealSlot, 
  GroceryItem, 
  ConsumptionEntry,
  GroceryPlan,
  SmartGroceryItem,
  NutritionSummary
} from '../types/diet-tracker';

// Date utilities
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

export const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};

export const getWeekRange = (date: string): { start: string; end: string } => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const startDate = new Date(d);
  startDate.setDate(d.getDate() - dayOfWeek);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
};

export const getMonthRange = (date: string): { start: string; end: string } => {
  const d = new Date(date);
  const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  
  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
};

// Family member utilities
export const getFamilyMemberById = (members: FamilyMember[], id: string): FamilyMember | undefined => {
  return members.find(member => member.id === id);
};

export const getFamilyMembersByRole = (members: FamilyMember[], role: FamilyMember['role']): FamilyMember[] => {
  return members.filter(member => member.role === role);
};

export const calculatePortionForMember = (baseQuantity: number, member: FamilyMember): number => {
  return baseQuantity * member.portionMultiplier;
};

// Nutrition calculations
export const calculateTotalCalories = (portions: { calories?: number }[]): number => {
  return portions.reduce((total, portion) => total + (portion.calories || 0), 0);
};

export const isWithinNutritionRange = (
  actual: number, 
  target: { min: number; max: number }
): boolean => {
  return actual >= target.min && actual <= target.max;
};

// Consumption tracking utilities
export const calculateCompliancePercentage = (
  planned: number, 
  consumed: number
): number => {
  if (planned === 0) return 100;
  const percentage = (consumed / planned) * 100;
  return Math.min(percentage, 100);
};

export const getMealComplianceForMember = (
  consumptionEntries: ConsumptionEntry[],
  memberId: string,
  date: string
): number => {
  const memberEntries = consumptionEntries.filter(
    entry => entry.familyMemberId === memberId && entry.date === date
  );
  
  if (memberEntries.length === 0) return 0;
  
  const totalCompliance = memberEntries.reduce(
    (sum, entry) => sum + entry.completionPercentage, 
    0
  );
  
  return totalCompliance / memberEntries.length;
};

// Grocery utilities
export const consolidateGroceryItems = (
  items: GroceryItem[]
): SmartGroceryItem[] => {
  const consolidated = new Map<string, SmartGroceryItem>();
  
  items.forEach(item => {
    const key = `${item.name}-${item.unit}`;
    
    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.consolidatedQuantity += item.requiredQuantity;
      existing.needToPurchase += item.needToPurchase;
      existing.usageByDate.push(...item.usageSchedule);
    } else {
      consolidated.set(key, {
        ...item,
        consolidatedQuantity: item.requiredQuantity,
        usageByDate: [...item.usageSchedule]
      });
    }
  });
  
  return Array.from(consolidated.values());
};

export const calculateGroceryPriority = (item: GroceryItem): GroceryItem['priority'] => {
  if (item.status === 'out_of_stock') return 'high';
  if (item.perishable && item.needToPurchase > 0) return 'high';
  if (item.status === 'low') return 'medium';
  return 'low';
};

export const generateShoppingList = (groceryPlan: GroceryPlan): string[] => {
  return groceryPlan.groceryItems
    .filter((item: SmartGroceryItem) => item.needToPurchase > 0)
    .sort((a: SmartGroceryItem, b: SmartGroceryItem) => {
      // Sort by priority (high first), then by category
      const priorityOrder: Record<SmartGroceryItem['priority'], number> = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.category.localeCompare(b.category);
    })
    .map((item: SmartGroceryItem) => `${item.name}: ${item.needToPurchase} ${item.unit}`);
};

// PDF extraction utilities with family member detection
export const extractMealDataFromPDF = async (pdfText: string): Promise<{
  meals: Partial<MealSlot>[];
  groceries: Partial<GroceryItem>[];
  nutrition: Partial<NutritionSummary>;
  familyMembers: Partial<FamilyMember>[];
}> => {
  // This will be enhanced with AI/ML parsing later
  // For now, return basic structure based on your PDF format
  
  const timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)?/gi;
  const mealRegex = /(Early Morning|Breakfast|Mid-Morning|Lunch|Evening Snack|Dinner|Bedtime)/gi;
  
  const meals: Partial<MealSlot>[] = [];
  const groceries: Partial<GroceryItem>[] = [];
  
  // Extract time-based meal slots
  const lines = pdfText.split('\n');
  let currentMeal: Partial<MealSlot> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const mealMatch = line.match(mealRegex);
    const timeMatch = line.match(timeRegex);
    
    // Check if line contains both meal and time
    if (mealMatch && timeMatch) {
      if (currentMeal) {
        meals.push(currentMeal);
      }
      
      currentMeal = {
        time: timeMatch[0].replace(/\s*(AM|PM)/i, ''),
        title: mealMatch[0],
        description: line.replace(mealMatch[0], '').replace(timeMatch[0], '').trim()
      };
    }
    // Check if line contains meal name followed by time in next lines
    else if (mealMatch) {
      if (currentMeal) {
        meals.push(currentMeal);
      }
      
      // Look for time in the same line or next few lines
      let timeStr = '';
      let description = '';
      
      // Check current line for time
      if (timeMatch) {
        timeStr = timeMatch[0].replace(/\s*(AM|PM)/i, '');
      }
      // Check next 2 lines for time and description
      else {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const nextTimeMatch = nextLine.match(timeRegex);
          if (nextTimeMatch) {
            timeStr = nextTimeMatch[0].replace(/\s*(AM|PM)/i, '');
            break;
          }
        }
      }
      
      // If no time found, use default based on meal type
      if (!timeStr) {
        switch (mealMatch[0].toLowerCase()) {
          case 'early morning': timeStr = '06:00'; break;
          case 'breakfast': timeStr = '08:00'; break;
          case 'mid-morning': timeStr = '10:30'; break;
          case 'lunch': timeStr = '13:00'; break;
          case 'evening snack': timeStr = '16:00'; break;
          case 'dinner': timeStr = '19:30'; break;
          case 'bedtime': timeStr = '21:30'; break;
          default: timeStr = '12:00';
        }
      }
      
      // Get description from next line if available
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(mealRegex) && !nextLine.match(timeRegex)) {
          description = nextLine;
        }
      }
      
      currentMeal = {
        time: timeStr,
        title: mealMatch[0],
        description: description
      };
    }
  }
  
  if (currentMeal) {
    meals.push(currentMeal);
  }
  
  // Extract grocery items from Kitchen Checklist section
  const kitchenSection = pdfText.match(/Kitchen Checklist[\s\S]*$/i);
  if (kitchenSection) {
    const itemRegex = /([A-Za-z\s]+):\s*(\d+(?:\.\d+)?)\s*([a-z]+)/gi;
    let match;
    
    while ((match = itemRegex.exec(kitchenSection[0])) !== null) {
      groceries.push({
        id: `grocery_${Date.now()}_${groceries.length}`,
        name: match[1].trim(),
        requiredQuantity: parseFloat(match[2]),
        needToPurchase: parseFloat(match[2]) * 0.8, // Assume 20% already in stock
        unit: match[3],
        category: categorizeGroceryItem(match[1].trim()),
        status: 'out_of_stock',
        source: 'meal_plan',
        estimatedCost: estimateGroceryCost(match[1].trim(), parseFloat(match[2]), match[3])
      });
    }
  }
  
  // Extract nutrition summary
  const nutritionMatch = pdfText.match(/Calories:\s*(\d+)–(\d+)\s*kcal[\s\S]*?Protein:\s*(\d+)–(\d+)\s*g[\s\S]*?Carbs:\s*(\d+)–(\d+)\s*g[\s\S]*?Fats:\s*(\d+)–(\d+)\s*g/i);
  
  const nutrition: Partial<NutritionSummary> = nutritionMatch ? {
    caloriesPerPerson: {
      min: parseInt(nutritionMatch[1]),
      max: parseInt(nutritionMatch[2])
    },
    macros: {
      protein: { min: parseInt(nutritionMatch[3]), max: parseInt(nutritionMatch[4]), unit: 'g' },
      carbs: { min: parseInt(nutritionMatch[5]), max: parseInt(nutritionMatch[6]), unit: 'g' },
      fats: { min: parseInt(nutritionMatch[7]), max: parseInt(nutritionMatch[8]), unit: 'g' }
    },
    dailyTargets: {
      water: 3.5, // Default from your PDF
      oil: 4.5   // Default from your PDF
    }
  } : {};
  
  // Extract family members from PDF text
  const familyMembers = extractFamilyMembersFromPDF(pdfText);
  
  return { meals, groceries, nutrition, familyMembers };
};

// Extract family members from PDF text
export const extractFamilyMembersFromPDF = (pdfText: string): Partial<FamilyMember>[] => {
  const familyMembers: Partial<FamilyMember>[] = [];
  
  // Patterns to identify family members and their characteristics
  const memberPatterns = [
    {
      keywords: ['ravi', 'main person', 'primary'],
      role: 'ravi' as const,
      defaultAge: 30,
      conditions: ['thyroid'],
      oilLimit: 4,
      portionMultiplier: 1.0
    },
    {
      keywords: ['father', 'dad', 'papa'],
      role: 'father' as const,
      defaultAge: 60,
      conditions: [],
      oilLimit: 4,
      portionMultiplier: 1.0,
      preferences: { favoriteFruits: ['guava'] }
    },
    {
      keywords: ['mother', 'mom', 'mama'],
      role: 'mother' as const,
      defaultAge: 55,
      conditions: ['thyroid'],
      oilLimit: 4,
      portionMultiplier: 1.0
    },
    {
      keywords: ['brother', 'bro'],
      role: 'brother' as const,
      defaultAge: 25,
      conditions: [],
      oilLimit: 4,
      portionMultiplier: 1.2
    },
    {
      keywords: ['wife', 'breastfeeding', 'lactating', 'nursing'],
      role: 'wife_bf' as const,
      defaultAge: 28,
      conditions: ['lactating'],
      oilLimit: 5,
      portionMultiplier: 1.1
    },
    {
      keywords: ['sister-in-law', 'sil', 'pregnant', 'expecting'],
      role: 'pregnant_sil' as const,
      defaultAge: 26,
      conditions: ['pregnancy'],
      oilLimit: 5,
      portionMultiplier: 1.15
    }
  ];

  // Dietary restriction patterns
  const dietaryPatterns = [
    { keywords: ['vegetarian', 'veg only', 'no meat'], restriction: 'vegetarian' },
    { keywords: ['vegan', 'no dairy', 'plant-based'], restriction: 'vegan' },
    { keywords: ['gluten-free', 'no gluten', 'celiac'], restriction: 'gluten_free' },
    { keywords: ['low sodium', 'less salt', 'sodium restricted'], restriction: 'low_sodium' },
    { keywords: ['low carb', 'keto', 'no carbs'], restriction: 'low_carb' }
  ];

  const text = pdfText.toLowerCase();
  
  // Look for explicit family member mentions
  for (const pattern of memberPatterns) {
    const found = pattern.keywords.some(keyword => text.includes(keyword));
    
    if (found) {
      // Use ONLY the predefined conditions for each role, don't scan the entire text
      const memberConditions: string[] = [...(pattern.conditions || [])];
      
      // Extract dietary restrictions
      const dietaryRestrictions: string[] = [];
      for (const dietPattern of dietaryPatterns) {
        const hasRestriction = dietPattern.keywords.some(keyword => text.includes(keyword));
        if (hasRestriction) {
          dietaryRestrictions.push(dietPattern.restriction);
        }
      }

      // Extract oil limits from text (look for patterns like "4 tsp oil", "5 teaspoons")
      const oilLimitMatch = text.match(/(\d+)\s*(tsp|teaspoons?|tbsp|tablespoons?)\s*oil/i);
      const extractedOilLimit = oilLimitMatch ? parseInt(oilLimitMatch[1]) : pattern.oilLimit;

      // Extract portion multipliers (look for "1.2x", "20% more", etc.)
      const portionMatch = text.match(/(\d+(?:\.\d+)?)[x×]\s*portion|(\d+)%\s*more/i);
      const extractedPortion = portionMatch ? 
        (portionMatch[1] ? parseFloat(portionMatch[1]) : 1 + parseInt(portionMatch[2]) / 100) :
        pattern.portionMultiplier || 1.0;

      // Create proper display name based on role
      let displayName = '';
      switch (pattern.role) {
        case 'ravi': displayName = 'Ravi'; break;
        case 'father': displayName = 'Father'; break;
        case 'mother': displayName = 'Mother'; break;
        case 'brother': displayName = 'Brother'; break;
        case 'wife_bf': displayName = 'Wife (Breastfeeding)'; break;
        case 'pregnant_sil': displayName = 'Sister-in-law (Pregnant)'; break;
      }

      const member: Partial<FamilyMember> = {
        name: displayName,
        role: pattern.role,
        age: pattern.defaultAge,
        medicalConditions: memberConditions,
        dietaryRestrictions,
        portionMultiplier: extractedPortion,
        waterIntakeTarget: 3.0, // Default
        oilLimit: extractedOilLimit,
        preferences: {
          favoriteFruits: pattern.preferences?.favoriteFruits || [],
          dislikedFoods: [],
          allergies: []
        }
      };

      familyMembers.push(member);
    }
  }

  // If no specific members found, create default family based on common patterns
  if (familyMembers.length === 0) {
    // Look for general family size indicators
    const familySizeMatch = text.match(/family of (\d+)|(\d+) people|(\d+) members/i);
    const familySize = familySizeMatch ? 
      parseInt(familySizeMatch[1] || familySizeMatch[2] || familySizeMatch[3]) : 4;

    // Create basic family structure
    const defaultMembers = [
      { role: 'ravi' as const, name: 'Ravi', age: 30 },
      { role: 'mother' as const, name: 'Mother', age: 55 },
      { role: 'father' as const, name: 'Father', age: 60 },
      { role: 'brother' as const, name: 'Brother', age: 25 }
    ].slice(0, familySize);

    for (const defaultMember of defaultMembers) {
      familyMembers.push({
        ...defaultMember,
        medicalConditions: [],
        dietaryRestrictions: [],
        portionMultiplier: 1.0,
        waterIntakeTarget: 3.0,
        oilLimit: 4,
        preferences: {
          favoriteFruits: [],
          dislikedFoods: [],
          allergies: []
        }
      });
    }
  }

  return familyMembers;
};

export const categorizeGroceryItem = (itemName: string): GroceryItem['category'] => {
  const name = itemName.toLowerCase();
  
  if (name.includes('rice') || name.includes('atta') || name.includes('batter')) {
    return 'grains';
  }
  if (name.includes('chicken') || name.includes('egg') || name.includes('dal')) {
    return 'proteins';
  }
  if (name.includes('milk') || name.includes('curd')) {
    return 'dairy';
  }
  if (name.includes('okra') || name.includes('cabbage') || name.includes('tomato') || 
      name.includes('cucumber') || name.includes('onion')) {
    return 'vegetables';
  }
  if (name.includes('nuts') || name.includes('sesame') || name.includes('chana')) {
    return 'nuts';
  }
  
  return 'condiments';
};

// Validation utilities
export const validateFamilyMember = (member: Partial<FamilyMember>): string[] => {
  const errors: string[] = [];
  
  if (!member.name || member.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!member.role) {
    errors.push('Role is required');
  }
  
  if (member.waterIntakeTarget && (member.waterIntakeTarget < 1 || member.waterIntakeTarget > 6)) {
    errors.push('Water intake target should be between 1-6 liters');
  }
  
  if (member.oilLimit && (member.oilLimit < 1 || member.oilLimit > 10)) {
    errors.push('Oil limit should be between 1-10 teaspoons');
  }
  
  return errors;
};

export const validateGroceryItem = (item: Partial<GroceryItem>): string[] => {
  const errors: string[] = [];
  
  if (!item.name || item.name.trim().length === 0) {
    errors.push('Item name is required');
  }
  
  if (!item.unit || item.unit.trim().length === 0) {
    errors.push('Unit is required');
  }
  
  if (item.requiredQuantity !== undefined && item.requiredQuantity < 0) {
    errors.push('Required quantity cannot be negative');
  }
  
  if (item.availableAtHome !== undefined && item.availableAtHome < 0) {
    errors.push('Available quantity cannot be negative');
  }
  
  return errors;
};

// Local storage utilities
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Estimate grocery cost based on item type and quantity
export const estimateGroceryCost = (itemName: string, quantity: number, unit: string): number => {
  const category = categorizeGroceryItem(itemName);
  
  // Base prices per unit in INR
  const basePrices: Record<string, number> = {
    'grains': unit === 'kg' ? 80 : 20,
    'vegetables': unit === 'kg' ? 60 : 15,
    'proteins': unit === 'kg' ? 400 : 100,
    'dairy': unit === 'l' ? 60 : unit === 'kg' ? 300 : 30,
    'fruits': unit === 'kg' ? 120 : 30,
    'spices': unit === 'kg' ? 800 : unit === 'g' ? 5 : 200,
    'nuts': unit === 'kg' ? 1200 : unit === 'g' ? 8 : 300,
    'condiments': unit === 'kg' ? 150 : unit === 'ml' ? 2 : 40
  };
  
  const basePrice = basePrices[category || 'condiments'] || 50;
  
  // Adjust quantity for unit conversion
  let adjustedQuantity = quantity;
  if (unit === 'g' && category !== 'spices') {
    adjustedQuantity = quantity / 1000; // Convert grams to kg for most items
  } else if (unit === 'ml') {
    adjustedQuantity = quantity / 1000; // Convert ml to liters
  }
  
  return Math.round(basePrice * adjustedQuantity);
};
export type TransportMode = 'CAR' | 'BIKE' | 'BUS' | 'TRAIN' | 'FLIGHT' | 'WALK' | 'OTHER';
export type PlanStatus = 'PLANNED' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';
export type DueType = 'DATE' | 'MONTH' | 'YEAR';

export interface TemplePlan {
  id: string;
  ownerId: string;           // Firebase auth uid
  createdAt: number;         // serverTimestamp
  updatedAt: number;         // serverTimestamp
  status: PlanStatus;        // derived & editable
  
  // Temple meta
  templeName: string;
  deity?: string;
  address?: string;
  location?: { lat: number; lng: number; placeId?: string };
  
  // Vow / reason
  vowReason: string;         // "Why I promised / what was asked"
  vowMadeOn?: number;        // timestamp
  due: { type: DueType; value: number }; // supports month/year-only commitments
  
  // Travel plan
  targetVisitDate?: number;  // planned date
  soloOrGroup: 'SOLO' | 'GROUP';
  companions?: string[];     // names or notes
  transportMode: TransportMode;
  routeMap?: {
    startLabel?: string;
    waypointNotes?: string;
    // optional waypoints (addresses or lat/lng)
    waypoints?: Array<{ label?: string; lat?: number; lng?: number; address?: string }>;
  };
  stayPlan?: { hotelName?: string; address?: string; notes?: string };
  checklist?: string[];      // items to do/pack (pre-visit)
  
  // Budget
  budget: { planned: number; savedSoFar: number };
  
  // Post-visit summary (latest)
  lastVisit?: {
    visitedOn: number;
    totalSpent: number;
    crowdLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    weatherNotes?: string;
    experience: string;          // overall write-up
    activitiesDone?: string[];   // e.g., darshan, annadanam, pradakshina
    bestMoments?: string[];
    improvementsNextTime?: string[];
    rating?: number;             // 1..5
    bestSeasonSuggestion?: string; // user's note: "Nov–Feb mornings"
    goodTimeToVisitNow?: boolean;  // their judgement
  };
  tags?: string[];             // e.g., "Andhra", "Hill temple"
  coverMedia?: { type: 'image' | 'video'; storagePath: string; width?: number; height?: number };
}

export interface Expense {
  id: string;
  createdAt: number;
  date: number;
  category: 'TRAVEL' | 'FOOD' | 'STAY' | 'OFFERINGS' | 'SHOPPING' | 'MISC';
  amount: number;
  notes?: string;
  receiptPath?: string; // Storage path
}

export interface MediaItem {
  id: string;
  createdAt: number;
  type: 'image' | 'video';
  caption?: string;
  storagePath: string;
  width?: number;
  height?: number;
  durationSec?: number; // videos
}

// Derived/computed helpers
export interface DerivedPlanData {
  daysToDue: number;
  isOverdue: boolean;
  budgetProgress: number; // savedSoFar / planned
  spentVsBudget: number;  // spent / planned
  totalSpent: number;
}

// Filter/search types
export interface TempleFilters {
  status?: PlanStatus[];
  deity?: string;
  location?: string;
  dueMonth?: number;
  dueYear?: number;
  tags?: string[];
  search?: string;
}

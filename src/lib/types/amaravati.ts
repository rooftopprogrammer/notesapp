// lib/types/amaravati.ts
// TypeScript interfaces for Amaravati place tracking system

export interface Source {
  id: string;
  url: string;
  note?: string;
  date?: string; // ISO date string (yyyy-MM-dd)
  time?: string; // 24hr HH:mm
}

export interface Place {
  id: string; // doc id
  name: string; // e.g., "Assembly Building"
  location?: string; // address or area description
  category?: string; // e.g., "Government", "Infrastructure"
  priority?: "High" | "Medium" | "Low";
  timeEstimate?: string; // e.g., "30 minutes", "1 hour"
  createdAt: number; // Date.now()
  updatedAt: number;
  tags?: string[]; // e.g., ["roads","government"]
  status: "idea" | "active" | "archived";
  visitCount: number; // derived metric for dashboard
  sources: Source[]; // embedded for convenience
}

export interface VisitItem {
  covered: boolean;
  observation?: string; // renamed from observedText for consistency
  photos?: string[]; // Firebase Storage URLs
  videos?: string[]; // Firebase Storage URLs
  updatedAt: number;
}

export interface Visit {
  id: string;
  date: string; // yyyy-MM-dd
  createdAt: number;
  updatedAt: number;
  order: string[]; // array of placeIds in today's order
  items: {
    [placeId: string]: VisitItem;
  };
}

// Form interfaces
export interface PlaceFormData {
  name: string;
  tags: string[];
  status: Place['status'];
}

export interface SourceFormData {
  url: string;
  note?: string;
  date?: string;
  time?: string;
}

// Chart data interfaces
export interface CoverageData {
  name: string;
  count: number;
}

export interface TrendData {
  date: string;
  covered: number;
}

export interface PieData {
  name: string;
  value: number;
  fill: string;
}

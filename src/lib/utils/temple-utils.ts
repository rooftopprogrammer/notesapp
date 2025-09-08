import { TemplePlan, DueType } from '@/lib/types/temple';

// Format money amount
export const formatMoney = (amount: number, currency: string = '₹'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    currencyDisplay: 'symbol',
  }).format(amount).replace('₹', currency);
};

// Format due date based on type
export const formatDue = (due: { type: DueType; value: number }): string => {
  switch (due.type) {
    case 'DATE':
      return new Date(due.value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    case 'MONTH':
      const year = Math.floor(due.value / 100);
      const month = due.value % 100;
      return new Date(year, month - 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric'
      });
    case 'YEAR':
      return due.value.toString();
    default:
      return 'Not set';
  }
};

// Calculate days to due
export const calcDaysToDue = (due: { type: DueType; value: number }): number => {
  const now = Date.now();
  let dueTimestamp: number;
  
  switch (due.type) {
    case 'DATE':
      dueTimestamp = due.value;
      break;
    case 'MONTH':
      const year = Math.floor(due.value / 100);
      const month = due.value % 100;
      // End of the specified month
      dueTimestamp = new Date(year, month, 0, 23, 59, 59).getTime();
      break;
    case 'YEAR':
      // End of the specified year
      dueTimestamp = new Date(due.value, 11, 31, 23, 59, 59).getTime();
      break;
    default:
      return Infinity;
  }
  
  return Math.ceil((dueTimestamp - now) / (1000 * 60 * 60 * 24));
};

// Calculate budget progress percentage
export const calcBudgetPct = (savedSoFar: number, planned: number): number => {
  if (!planned || planned === 0) return 0;
  return Math.min((savedSoFar / planned) * 100, 100);
};

// Check if plan is overdue
export const isOverdue = (plan: TemplePlan): boolean => {
  return plan.status === 'OVERDUE' || calcDaysToDue(plan.due) < 0;
};

// Get status color for UI
export const getStatusColor = (status: TemplePlan['status']): string => {
  switch (status) {
    case 'PLANNED':
      return 'bg-blue-100 text-blue-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get transport mode display text and icon
export const getTransportDisplay = (mode: TemplePlan['transportMode']): { text: string; icon: string } => {
  switch (mode) {
    case 'CAR':
      return { text: 'Car', icon: '🚗' };
    case 'BIKE':
      return { text: 'Bike', icon: '🏍️' };
    case 'BUS':
      return { text: 'Bus', icon: '🚌' };
    case 'TRAIN':
      return { text: 'Train', icon: '🚆' };
    case 'FLIGHT':
      return { text: 'Flight', icon: '✈️' };
    case 'WALK':
      return { text: 'Walk', icon: '🚶' };
    case 'OTHER':
      return { text: 'Other', icon: '🚲' };
    default:
      return { text: 'Unknown', icon: '❓' };
  }
};

// Get crowd level display
export const getCrowdLevelDisplay = (level?: 'LOW' | 'MEDIUM' | 'HIGH'): { text: string; color: string } => {
  switch (level) {
    case 'LOW':
      return { text: 'Low Crowd', color: 'text-green-600' };
    case 'MEDIUM':
      return { text: 'Medium Crowd', color: 'text-yellow-600' };
    case 'HIGH':
      return { text: 'High Crowd', color: 'text-red-600' };
    default:
      return { text: 'Unknown', color: 'text-gray-600' };
  }
};

// Generate static map URL (mock implementation - replace with real service)
export const generateStaticMapUrl = (
  origin: string,
  destination: string,
  waypoints?: Array<{ label?: string; address?: string }>,
  size: string = '600x400'
): string => {
  // This is a mock implementation. In a real app, you'd use Google Static Maps API
  // or similar service with proper coordinates and styling
  const baseUrl = 'https://via.placeholder.com';
  return `${baseUrl}/${size}/e5e7eb/6b7280?text=Route+Map`;
};

// Generate Google Maps navigation URL
export const generateMapsUrl = (
  origin?: string,
  destination?: string,
  waypoints?: Array<{ address?: string }>
): string => {
  const baseUrl = 'https://www.google.com/maps/dir/';
  
  let url = baseUrl;
  
  if (origin) {
    url += encodeURIComponent(origin) + '/';
  }
  
  if (waypoints && waypoints.length > 0) {
    waypoints.forEach(waypoint => {
      if (waypoint.address) {
        url += encodeURIComponent(waypoint.address) + '/';
      }
    });
  }
  
  if (destination) {
    url += encodeURIComponent(destination);
  }
  
  return url;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration for videos
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Validate file type for media upload
export const isValidMediaFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];
  
  return validTypes.includes(file.type);
};

// Get expense category display
export const getExpenseCategoryDisplay = (category: string): { text: string; icon: string; color: string } => {
  switch (category) {
    case 'TRAVEL':
      return { text: 'Travel', icon: '🚗', color: 'bg-blue-100 text-blue-800' };
    case 'FOOD':
      return { text: 'Food', icon: '🍽️', color: 'bg-orange-100 text-orange-800' };
    case 'STAY':
      return { text: 'Stay', icon: '🏨', color: 'bg-purple-100 text-purple-800' };
    case 'OFFERINGS':
      return { text: 'Offerings', icon: '🙏', color: 'bg-yellow-100 text-yellow-800' };
    case 'SHOPPING':
      return { text: 'Shopping', icon: '🛍️', color: 'bg-green-100 text-green-800' };
    case 'MISC':
      return { text: 'Miscellaneous', icon: '💰', color: 'bg-gray-100 text-gray-800' };
    default:
      return { text: 'Other', icon: '❓', color: 'bg-gray-100 text-gray-800' };
  }
};

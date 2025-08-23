// app/amaravati/plan/page.tsx
// Main Plan page with drag-and-drop visit planning

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Place, Visit } from '@/lib/types/amaravati';
import { getAllPlaces } from '@/lib/amaravati/firestore';
import { 
  getTodayVisit, 
  createOrUpdateVisit, 
  addPlaceToVisit, 
  updateVisitItemCoverage,
  updateVisitItemObservation,
  reorderVisitPlaces
} from '@/lib/amaravati/firestore';
import { uploadImage, uploadVideo } from '@/lib/amaravati/storage';
import AmaravatiNav from '@/components/amaravati/AmaravatiNav';
import AvailablePlacesList from '@/components/amaravati/plan/AvailablePlacesList';
import TodayPlanBoard from '@/components/amaravati/plan/TodayPlanBoard';
import { Calendar, Share2, RotateCcw } from 'lucide-react';

export default function PlanPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [todayVisit, setTodayVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [placesData, visitData] = await Promise.all([
          getAllPlaces(),
          getTodayVisit(selectedDate)
        ]);
        
        setPlaces(placesData);
        setTodayVisit(visitData);
      } catch (error) {
        console.error('Error loading plan data:', error);
        toast.error('Failed to load plan data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  // Add place to today's plan
  const handleAddToToday = async (placeId: string) => {
    try {
      const updatedVisit = await addPlaceToVisit(selectedDate, placeId);
      setTodayVisit(updatedVisit);
      toast.success('Place added to today\'s plan');
    } catch (error) {
      console.error('Error adding place to visit:', error);
      toast.error('Failed to add place');
    }
  };

  // Reorder places in plan
  const handleOrderChange = async (newOrder: string[]) => {
    if (!todayVisit) return;

    try {
      const updatedVisit = await reorderVisitPlaces(todayVisit.id, newOrder);
      setTodayVisit(updatedVisit);
    } catch (error) {
      console.error('Error reordering places:', error);
      toast.error('Failed to reorder places');
      // Revert the order change in UI if needed
    }
  };

  // Toggle place coverage
  const handleCoverageToggle = async (placeId: string, covered: boolean) => {
    if (!todayVisit) return;

    try {
      const updatedVisit = await updateVisitItemCoverage(todayVisit.id, placeId, covered);
      setTodayVisit(updatedVisit);
      
      if (covered) {
        toast.success('Place marked as covered');
      } else {
        toast.success('Place unmarked');
      }
    } catch (error) {
      console.error('Error updating coverage:', error);
      toast.error('Failed to update coverage');
    }
  };

  // Update observation
  const handleObservationUpdate = async (placeId: string, text: string) => {
    if (!todayVisit) return;

    try {
      const updatedVisit = await updateVisitItemObservation(todayVisit.id, placeId, text);
      setTodayVisit(updatedVisit);
      toast.success('Observation saved');
    } catch (error) {
      console.error('Error updating observation:', error);
      toast.error('Failed to save observation');
    }
  };

  // Handle media upload
  const handleMediaUpload = async (placeId: string, files: File[]) => {
    if (!todayVisit) return;

    try {
      const uploadPromises = files.map(file => {
        if (file.type.startsWith('image/')) {
          return uploadImage(file, todayVisit.id, placeId);
        } else if (file.type.startsWith('video/')) {
          return uploadVideo(file, todayVisit.id, placeId);
        }
        throw new Error(`Unsupported file type: ${file.type}`);
      });

      const urls = await Promise.all(uploadPromises);
      
      // Update visit item with new media URLs
      const currentItem = todayVisit.items[placeId] || { covered: false, updatedAt: Date.now() };
      const photos = [...(currentItem.photos || [])];
      const videos = [...(currentItem.videos || [])];

      urls.forEach((url, index) => {
        if (files[index].type.startsWith('image/')) {
          photos.push(url);
        } else {
          videos.push(url);
        }
      });

      const updatedVisit = await createOrUpdateVisit({
        ...todayVisit,
        items: {
          ...todayVisit.items,
          [placeId]: {
            ...currentItem,
            photos,
            videos,
            updatedAt: Date.now()
          }
        },
        updatedAt: Date.now()
      });

      setTodayVisit(updatedVisit);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    }
  };

  // Export plan
  const handleExportPlan = () => {
    if (!todayVisit || todayVisit.order.length === 0) {
      toast.error('No plan to export');
      return;
    }

    const planText = generatePlanText();
    
    // Copy to clipboard
    navigator.clipboard.writeText(planText).then(() => {
      toast.success('Plan copied to clipboard');
    }).catch(() => {
      // Fallback: create a download link
      const blob = new Blob([planText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amaravati-plan-${selectedDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Plan downloaded');
    });
  };

  // Generate plan text for export
  const generatePlanText = (): string => {
    if (!todayVisit) return '';

    const orderedPlaces = todayVisit.order
      .map(placeId => places.find(p => p.id === placeId))
      .filter(Boolean) as Place[];

    let text = `Amaravati Visit Plan - ${selectedDate}\n`;
    text += '='.repeat(40) + '\n\n';

    orderedPlaces.forEach((place, index) => {
      const item = todayVisit.items[place.id];
      text += `${index + 1}. ${place.name}\n`;
      
      if (place.location) text += `   Location: ${place.location}\n`;
      if (place.priority) text += `   Priority: ${place.priority}\n`;
      if (place.timeEstimate) text += `   Time: ${place.timeEstimate}\n`;
      if (place.category) text += `   Category: ${place.category}\n`;
      
      if (item?.covered) text += `   ✅ Covered\n`;
      if (item?.observation) text += `   Notes: ${item.observation}\n`;
      
      text += '\n';
    });

    const coveredCount = todayVisit.order.filter(id => todayVisit.items[id]?.covered).length;
    text += `Progress: ${coveredCount}/${todayVisit.order.length} places covered\n`;

    return text;
  };

  // Reset today's plan
  const handleResetPlan = async () => {
    if (!todayVisit || todayVisit.order.length === 0) return;

    if (confirm('Are you sure you want to reset today\'s plan? This will remove all places from the plan.')) {
      try {
        const resetVisit = await createOrUpdateVisit({
          ...todayVisit,
          order: [],
          items: {},
          updatedAt: Date.now()
        });
        
        setTodayVisit(resetVisit);
        toast.success('Plan reset successfully');
      } catch (error) {
        console.error('Error resetting plan:', error);
        toast.error('Failed to reset plan');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const plannedPlaceIds = todayVisit?.order || [];
  const coveredCount = plannedPlaceIds.filter(id => todayVisit?.items[id]?.covered).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <AmaravatiNav />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Visit Plan
              </h1>
              
              {/* Date selector */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Progress indicator */}
              {plannedPlaceIds.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Progress:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {coveredCount}/{plannedPlaceIds.length}
                  </span>
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${(coveredCount / plannedPlaceIds.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {plannedPlaceIds.length > 0 && (
                <>
                  <button
                    onClick={handleExportPlan}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Export
                  </button>
                  
                  <button
                    onClick={handleResetPlan}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Available places sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <AvailablePlacesList
              places={places}
              addedPlaceIds={plannedPlaceIds}
              onAddToToday={handleAddToToday}
            />
          </div>

          {/* Today's plan board */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 overflow-hidden">
            <TodayPlanBoard
              places={places}
              visit={todayVisit || { 
                id: '', 
                date: selectedDate, 
                createdAt: Date.now(), 
                updatedAt: Date.now(), 
                order: [], 
                items: {} 
              }}
              onOrderChange={handleOrderChange}
              onCoverageToggle={handleCoverageToggle}
              onObservationUpdate={handleObservationUpdate}
              onMediaUpload={handleMediaUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

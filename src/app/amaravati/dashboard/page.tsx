// app/amaravati/dashboard/page.tsx
// Main Dashboard page with analytics and insights

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Place, Visit } from '@/lib/types/amaravati';
import { getAllPlaces, getVisitsByDateRange } from '@/lib/amaravati/firestore';
import AmaravatiNav from '@/components/amaravati/AmaravatiNav';
import AnalyticsCards from '@/components/amaravati/dashboard/AnalyticsCards';
import VisitChart from '@/components/amaravati/dashboard/VisitChart';
import SmartSuggestions from '@/components/amaravati/dashboard/SmartSuggestions';
import { 
  BarChart3, 
  Download, 
  RefreshCw,
  TrendingUp,
  Video
} from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function DashboardPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Calculate date range
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), dateRange - 1), 'yyyy-MM-dd');
        
        const [placesData, visitsData] = await Promise.all([
          getAllPlaces(),
          getVisitsByDateRange(startDate, endDate)
        ]);
        
        setPlaces(placesData);
        setVisits(visitsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [dateRange]);

  // Refresh data
  const handleRefresh = async () => {
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), dateRange - 1), 'yyyy-MM-dd');
      
      const [placesData, visitsData] = await Promise.all([
        getAllPlaces(),
        getVisitsByDateRange(startDate, endDate)
      ]);
      
      setPlaces(placesData);
      setVisits(visitsData);
      toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error('Failed to refresh dashboard');
    }
  };

  // Export dashboard data
  const handleExportData = () => {
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        summary: {
          totalPlaces: places.length,
          activePlaces: places.filter(p => p.status === 'active').length,
          totalVisits: visits.length,
          placesVisited: places.filter(p => p.visitCount > 0).length,
        },
        places: places.map(p => ({
          name: p.name,
          status: p.status,
          category: p.category,
          priority: p.priority,
          visitCount: p.visitCount,
          tags: p.tags,
        })),
        visits: visits.map(v => ({
          date: v.date,
          placesPlanned: v.order.length,
          placesCompleted: v.order.filter(id => v.items[id]?.covered).length,
        })),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `amaravati-dashboard-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      toast.success('Dashboard data exported');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                Analytics Dashboard
              </h1>
              
              {/* Data summary */}
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{places.length} places</span>
                <span>•</span>
                <span>{visits.length} visits</span>
                <span>•</span>
                <span>Last {dateRange} days</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date range selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              {/* Chart type toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                <button
                  onClick={() => setChartType('area')}
                  className={`p-2 rounded ${
                    chartType === 'area'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Area Chart"
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded ${
                    chartType === 'bar'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Bar Chart"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>

              {/* Action buttons */}
              <Link
                href="/amaravati/instructions"
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                title="Video Editing Instructions"
              >
                <Video className="h-4 w-4" />
                Video Editing
              </Link>

              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Analytics cards */}
          <AnalyticsCards places={places} visits={visits} />

          {/* Charts and suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visit chart - takes 2 columns */}
            <div className="lg:col-span-2">
              <VisitChart 
                visits={visits} 
                chartType={chartType}
                days={dateRange}
              />
            </div>

            {/* Smart suggestions - takes 1 column */}
            <div className="lg:col-span-1">
              <SmartSuggestions places={places} visits={visits} />
            </div>
          </div>

          {/* Additional insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top visited places */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Most Visited Places
              </h3>
              <div className="space-y-3">
                {places
                  .filter(p => p.visitCount > 0)
                  .sort((a, b) => b.visitCount - a.visitCount)
                  .slice(0, 5)
                  .map((place, index) => (
                    <div key={place.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{place.name}</p>
                          {place.category && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{place.category}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {place.visitCount} visit{place.visitCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                {places.filter(p => p.visitCount > 0).length === 0 && (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    No places visited yet
                  </p>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Places by Category
              </h3>
              <div className="space-y-3">
                {Array.from(new Set(places.map(p => p.category).filter(Boolean)))
                  .map(category => {
                    const categoryPlaces = places.filter(p => p.category === category);
                    const visitedCount = categoryPlaces.filter(p => p.visitCount > 0).length;
                    const percentage = categoryPlaces.length > 0 ? (visitedCount / categoryPlaces.length) * 100 : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {visitedCount}/{categoryPlaces.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {places.filter(p => p.category).length === 0 && (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    No categories assigned yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// app/amaravati/ideas/page.tsx
// Ideas & Intel collection page

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Place } from '@/lib/types/amaravati';
import { getAllPlaces } from '@/lib/amaravati/firestore';
import { debounce } from '@/lib/amaravati/utils';
import { Toaster } from 'react-hot-toast';
import AmaravatiNav from '@/components/amaravati/AmaravatiNav';
import IdeasForm from '@/components/amaravati/ideas/IdeasForm';
import PlaceCard from '@/components/amaravati/ideas/PlaceCard';
import LoadingSpinner from '@/components/amaravati/LoadingSpinner';

export default function IdeasPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Place['status'] | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');

  // Load places on mount
  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      setError('');
      const placesData = await getAllPlaces();
      setPlaces(placesData);
    } catch (error) {
      console.error('Error loading places:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load places. Please check your Firebase configuration.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  // Filter places based on search and filters
  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      // Search filter
      const matchesSearch = !searchTerm || 
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || place.status === statusFilter;

      // Tag filter
      const matchesTag = !tagFilter || 
        place.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [places, searchTerm, statusFilter, tagFilter]);

  // Get unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    places.forEach(place => {
      place.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [places]);

  const handlePlaceCreated = (newPlace: Place) => {
    setPlaces(prev => [newPlace, ...prev]);
  };

  const handlePlaceUpdated = (updatedPlace: Place) => {
    setPlaces(prev => 
      prev.map(place => 
        place.id === updatedPlace.id ? updatedPlace : place
      )
    );
  };

  const handlePlaceDeleted = (placeId: string) => {
    setPlaces(prev => prev.filter(place => place.id !== placeId));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <AmaravatiNav />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔍 Ideas & Intel
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-red-600 dark:text-red-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Firebase Configuration Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                <button 
                  onClick={loadPlaces}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Search and Filters */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Places
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by name or tags..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Place['status'] | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="idea">Idea</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tag
              </label>
              <select
                id="tag-filter"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredPlaces.length} of {places.length} places
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Add New Place Form */}
          <div className="xl:col-span-1">
            <IdeasForm onPlaceCreated={handlePlaceCreated} />
          </div>

          {/* Places List */}
          <div className="xl:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading places...</span>
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {places.length === 0 ? 'No places yet' : 'No places match your filters'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {places.length === 0 
                    ? 'Start by adding your first place to track ideas and sources.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPlaces.map(place => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onPlaceUpdated={handlePlaceUpdated}
                    onPlaceDeleted={handlePlaceDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

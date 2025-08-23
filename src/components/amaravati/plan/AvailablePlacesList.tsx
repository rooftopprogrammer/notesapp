// components/amaravati/plan/AvailablePlacesList.tsx
// List of available places to add to today's plan

'use client';

import React, { useState } from 'react';
import { Place } from '@/lib/types/amaravati';
import { Plus, Search, MapPin, Clock } from 'lucide-react';

interface AvailablePlacesListProps {
  places: Place[];
  addedPlaceIds: string[];
  onAddToToday: (placeId: string) => void;
}

export default function AvailablePlacesList({
  places,
  addedPlaceIds,
  onAddToToday,
}: AvailablePlacesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter available places (not already added to today's plan)
  const availablePlaces = places.filter(place => 
    place.status === 'active' && !addedPlaceIds.includes(place.id)
  );

  // Apply search and filters
  const filteredPlaces = availablePlaces.filter(place => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         place.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         place.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPriority = priorityFilter === 'all' || place.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || place.category === categoryFilter;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Get unique categories and priorities for filters
  const categories = Array.from(new Set(availablePlaces.map(p => p.category).filter(Boolean)));
  const priorities = ['High', 'Medium', 'Low'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Available Places ({filteredPlaces.length})
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Places List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">🔍</div>
            <p className="text-gray-600 dark:text-gray-400">
              {availablePlaces.length === 0 
                ? 'No active places available'
                : 'No places match your filters'}
            </p>
          </div>
        ) : (
          filteredPlaces.map(place => (
            <PlaceCard
              key={place.id}
              place={place}
              onAddToToday={onAddToToday}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface PlaceCardProps {
  place: Place;
  onAddToToday: (placeId: string) => void;
}

function PlaceCard({ place, onAddToToday }: PlaceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {place.name}
          </h4>
          
          {place.location && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{place.location}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            {place.priority && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                place.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                place.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {place.priority}
              </span>
            )}

            {place.timeEstimate && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{place.timeEstimate}</span>
              </div>
            )}

            {place.category && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                {place.category}
              </span>
            )}
          </div>

          {place.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {place.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
              {place.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{place.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onAddToToday(place.id)}
          className="ml-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          title="Add to today's plan"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

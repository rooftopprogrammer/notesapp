// components/amaravati/ideas/SourceList.tsx
// Component for displaying and managing sources for a place

'use client';

import React, { useState } from 'react';
import { Source, Place } from '@/lib/types/amaravati';
import { addSourceToPlace, updateSourceInPlace, removeSourceFromPlace } from '@/lib/amaravati/firestore';
import { isValidUrl } from '@/lib/amaravati/utils';
import toast from 'react-hot-toast';
import SourceItem from './SourceItem';

interface SourceListProps {
  place: Place;
  onPlaceUpdated: (place: Place) => void;
}

export default function SourceList({ place, onPlaceUpdated }: SourceListProps) {
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    note: '',
    date: '',
    time: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url.trim()) {
      toast.error('URL is required');
      return;
    }

    if (!isValidUrl(formData.url)) {
      toast.error('Please enter a valid URL');
      return;
    }

    if (formData.note && formData.note.length > 2000) {
      toast.error('Note must be less than 2000 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSourceToPlace(place.id, {
        url: formData.url.trim(),
        note: formData.note.trim() || undefined,
        date: formData.date || undefined,
        time: formData.time || undefined,
      });

      // Refresh place data
      const updatedPlace = { 
        ...place, 
        sources: [...place.sources, {
          id: `temp-${Date.now()}`, // Temporary ID until refresh
          url: formData.url.trim(),
          note: formData.note.trim() || undefined,
          date: formData.date || undefined,
          time: formData.time || undefined,
        }]
      };
      onPlaceUpdated(updatedPlace);

      toast.success('Source added successfully!');
      setFormData({ url: '', note: '', date: '', time: '' });
      setIsAddingSource(false);
    } catch (error) {
      toast.error('Failed to add source');
      console.error('Error adding source:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSource = async (sourceId: string, updates: Partial<Source>) => {
    try {
      await updateSourceInPlace(place.id, sourceId, updates);
      
      const updatedPlace = {
        ...place,
        sources: place.sources.map(source =>
          source.id === sourceId ? { ...source, ...updates } : source
        ),
      };
      onPlaceUpdated(updatedPlace);
      toast.success('Source updated successfully!');
    } catch (error) {
      toast.error('Failed to update source');
      console.error('Error updating source:', error);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await removeSourceFromPlace(place.id, sourceId);
      
      const updatedPlace = {
        ...place,
        sources: place.sources.filter(source => source.id !== sourceId),
      };
      onPlaceUpdated(updatedPlace);
      toast.success('Source deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete source');
      console.error('Error deleting source:', error);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Sources ({place.sources.length})
        </button>
        
        {isExpanded && (
          <button
            onClick={() => setIsAddingSource(!isAddingSource)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isAddingSource ? 'Cancel' : '+ Add Source'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Add Source Form */}
          {isAddingSource && (
            <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
              <div>
                <label htmlFor="source-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL *
                </label>
                <input
                  id="source-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="source-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note
                </label>
                <textarea
                  id="source-note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a note or summary..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.note.length}/2000 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="source-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    id="source-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="source-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    id="source-time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? 'Adding...' : 'Add Source'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSource(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Sources List */}
          {place.sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No sources added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {place.sources.map((source) => (
                <SourceItem
                  key={source.id}
                  source={source}
                  onUpdate={(updates: Partial<Source>) => handleUpdateSource(source.id, updates)}
                  onDelete={() => handleDeleteSource(source.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

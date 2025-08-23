// components/amaravati/ideas/PlaceCard.tsx
// Card component for displaying individual places

'use client';

import React, { useState } from 'react';
import { Place } from '@/lib/types/amaravati';
import { updatePlace, deletePlace } from '@/lib/amaravati/firestore';
import { generatePlaceBrief } from '@/lib/amaravati/utils';
import toast from 'react-hot-toast';
import SourceList from './SourceList';
import CopyToClipboard from '../CopyToClipboard';

interface PlaceCardProps {
  place: Place;
  onPlaceUpdated: (place: Place) => void;
  onPlaceDeleted: (placeId: string) => void;
}

export default function PlaceCard({ place, onPlaceUpdated, onPlaceDeleted }: PlaceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: place.name,
    tags: place.tags?.join(', ') || '',
    status: place.status,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error('Place name is required');
      return;
    }

    setIsUpdating(true);
    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await updatePlace(place.id, {
        name: formData.name.trim(),
        tags,
        status: formData.status,
      });

      const updatedPlace = {
        ...place,
        name: formData.name.trim(),
        tags,
        status: formData.status,
        updatedAt: Date.now(),
      };

      onPlaceUpdated(updatedPlace);
      toast.success('Place updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update place');
      console.error('Error updating place:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${place.name}"? This will also delete all associated sources.`)) {
      return;
    }

    try {
      await deletePlace(place.id);
      onPlaceDeleted(place.id);
      toast.success('Place deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete place');
      console.error('Error deleting place:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: place.name,
      tags: place.tags?.join(', ') || '',
      status: place.status,
    });
    setIsEditing(false);
  };

  const getStatusBadgeClass = (status: Place['status']) => {
    switch (status) {
      case 'idea':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'archived':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., roads, government, infrastructure"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Place['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="idea">Idea</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed text-sm"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {place.name}
              </h3>
              
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(place.status)}`}>
                  {place.status.charAt(0).toUpperCase() + place.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {place.visitCount} visit{place.visitCount !== 1 ? 's' : ''}
                </span>
              </div>

              {place.tags && place.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {place.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 ml-4">
            <CopyToClipboard
              getText={() => generatePlaceBrief(place)}
              label="Copy place brief"
              className="!p-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </CopyToClipboard>
            
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Edit place"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete place"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Sources */}
      {!isEditing && (
        <SourceList place={place} onPlaceUpdated={onPlaceUpdated} />
      )}
    </div>
  );
}

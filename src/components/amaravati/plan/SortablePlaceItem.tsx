// components/amaravati/plan/SortablePlaceItem.tsx
// Sortable place item with coverage tracking and media upload

'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Place, VisitItem } from '@/lib/types/amaravati';
import { 
  GripVertical, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Circle, 
  Camera,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';

interface SortablePlaceItemProps {
  place: Place;
  visitItem?: VisitItem;
  index: number;
  onCoverageToggle: (placeId: string, covered: boolean) => void;
  onObservationUpdate: (placeId: string, text: string) => void;
  onMediaUpload: (placeId: string, files: File[]) => void;
}

export default function SortablePlaceItem({
  place,
  visitItem,
  index,
  onCoverageToggle,
  onObservationUpdate,
  onMediaUpload,
}: SortablePlaceItemProps) {
  const [observationExpanded, setObservationExpanded] = useState(false);
  const [observationText, setObservationText] = useState(visitItem?.observation || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCovered = visitItem?.covered || false;
  const hasMedia = (visitItem?.photos?.length || 0) + (visitItem?.videos?.length || 0) > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onMediaUpload(place.id, files);
    }
  };

  const handleObservationSave = () => {
    onObservationUpdate(place.id, observationText);
    setObservationExpanded(false);
  };

  const handleObservationCancel = () => {
    setObservationText(visitItem?.observation || '');
    setObservationExpanded(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 shadow-sm transition-all duration-200 ${
        isDragging
          ? 'border-blue-300 shadow-lg scale-105 opacity-90'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isCovered ? 'ring-2 ring-green-200 dark:ring-green-800' : ''}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            className="mt-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Order number */}
          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>

          {/* Place info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {place.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{place.location}</span>
                </div>
                {place.category && (
                  <span className="inline-block mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                    {place.category}
                  </span>
                )}
              </div>

              {/* Coverage toggle */}
              <button
                onClick={() => onCoverageToggle(place.id, !isCovered)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
                  isCovered
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isCovered ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Covered
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Mark as covered
                  </>
                )}
              </button>
            </div>

            {/* Priority and time estimate */}
            {(place.priority || place.timeEstimate) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {place.priority && (
                  <span className={`font-medium ${
                    place.priority === 'High' ? 'text-red-600 dark:text-red-400' :
                    place.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {place.priority} priority
                  </span>
                )}
                {place.timeEstimate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{place.timeEstimate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {/* Media upload */}
              <label className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <Camera className="h-4 w-4" />
                Add media
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Observation toggle */}
              <button
                onClick={() => setObservationExpanded(!observationExpanded)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Observation
              </button>

              {/* Media indicator */}
              {hasMedia && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <ImageIcon className="h-4 w-4" />
                  {(visitItem?.photos?.length || 0) + (visitItem?.videos?.length || 0)} files
                </div>
              )}
            </div>

            {/* Observation input */}
            {observationExpanded && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <textarea
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  placeholder="Add your observations about this place..."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleObservationCancel}
                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleObservationSave}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Existing observation display */}
            {!observationExpanded && visitItem?.observation && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start justify-between">
                  <span>{visitItem.observation}</span>
                  <button
                    onClick={() => setObservationExpanded(true)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-2"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

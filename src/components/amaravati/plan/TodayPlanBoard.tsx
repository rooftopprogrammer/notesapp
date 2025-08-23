// components/amaravati/plan/TodayPlanBoard.tsx
// Drag and drop sortable board for today's visit plan

'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Place, Visit } from '@/lib/types/amaravati';
import SortablePlaceItem from './SortablePlaceItem';

interface TodayPlanBoardProps {
  places: Place[];
  visit: Visit;
  onOrderChange: (newOrder: string[]) => void;
  onCoverageToggle: (placeId: string, covered: boolean) => void;
  onObservationUpdate: (placeId: string, text: string) => void;
  onMediaUpload: (placeId: string, files: File[]) => void;
}

export default function TodayPlanBoard({
  places,
  visit,
  onOrderChange,
  onCoverageToggle,
  onObservationUpdate,
  onMediaUpload,
}: TodayPlanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get places in the current order
  const orderedPlaces = visit.order
    .map(placeId => places.find(p => p.id === placeId))
    .filter(Boolean) as Place[];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visit.order.indexOf(active.id as string);
      const newIndex = visit.order.indexOf(over.id as string);
      
      const newOrder = arrayMove(visit.order, oldIndex, newIndex);
      onOrderChange(newOrder);
    }
  };

  if (orderedPlaces.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No places in today&apos;s plan
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Add places from the left panel to start planning your visit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Today&apos;s Visit Plan ({orderedPlaces.length} places)
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Drag to reorder
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visit.order} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orderedPlaces.map((place, index) => (
              <SortablePlaceItem
                key={place.id}
                place={place}
                visitItem={visit.items[place.id]}
                index={index}
                onCoverageToggle={onCoverageToggle}
                onObservationUpdate={onObservationUpdate}
                onMediaUpload={onMediaUpload}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

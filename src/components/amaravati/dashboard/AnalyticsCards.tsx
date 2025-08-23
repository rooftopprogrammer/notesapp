// components/amaravati/dashboard/AnalyticsCards.tsx
// Overview cards showing key metrics

'use client';

import React from 'react';
import { Place, Visit } from '@/lib/types/amaravati';
import { MapPin, Calendar, TrendingUp, Clock } from 'lucide-react';

interface AnalyticsCardsProps {
  places: Place[];
  visits: Visit[];
}

export default function AnalyticsCards({ places, visits }: AnalyticsCardsProps) {
  // Calculate metrics
  const totalPlaces = places.length;
  const activePlaces = places.filter(p => p.status === 'active').length;
  const totalVisits = visits.length;
  const completedPlaces = places.filter(p => p.visitCount > 0).length;
  
  // Calculate recent activity (last 7 days)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const recentVisits = visits.filter(v => new Date(v.date) >= lastWeek).length;
  
  // Calculate completion rate
  const completionRate = activePlaces > 0 ? (completedPlaces / activePlaces) * 100 : 0;

  const cards = [
    {
      title: 'Total Places',
      value: totalPlaces,
      subtitle: `${activePlaces} active`,
      icon: MapPin,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      bgColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Total Visits',
      value: totalVisits,
      subtitle: `${recentVisits} this week`,
      icon: Calendar,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      bgColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      subtitle: `${completedPlaces} of ${activePlaces} places`,
      icon: TrendingUp,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      bgColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Avg Visit Time',
      value: '45m',
      subtitle: 'estimated per place',
      icon: Clock,
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      bgColor: 'border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 ${card.bgColor}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {card.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {card.subtitle}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

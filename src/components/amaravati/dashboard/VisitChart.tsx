// components/amaravati/dashboard/VisitChart.tsx
// Chart showing visit trends over time

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Visit } from '@/lib/types/amaravati';
import { format, eachDayOfInterval, subDays } from 'date-fns';

interface VisitChartProps {
  visits: Visit[];
  chartType?: 'area' | 'bar';
  days?: number;
}

export default function VisitChart({ 
  visits, 
  chartType = 'area',
  days = 30 
}: VisitChartProps) {
  // Generate data for the last N days
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);
  
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  
  const chartData = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayVisits = visits.filter(v => v.date === dateStr);
    
    // Calculate metrics for this day
    const visitCount = dayVisits.length;
    const placesVisited = dayVisits.reduce((total, visit) => {
      return total + visit.order.length;
    }, 0);
    const placesCompleted = dayVisits.reduce((total, visit) => {
      return total + visit.order.filter(placeId => visit.items[placeId]?.covered).length;
    }, 0);
    
    return {
      date: format(date, 'MMM dd'),
      fullDate: dateStr,
      visits: visitCount,
      places: placesVisited,
      completed: placesCompleted,
      completionRate: placesVisited > 0 ? (placesCompleted / placesVisited) * 100 : 0,
    };
  });

  interface TooltipEntry {
    name: string;
    value: number;
    color: string;
  }

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: TooltipEntry[]; 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: TooltipEntry, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name === 'visits' && `Visits: ${entry.value}`}
              {entry.name === 'places' && `Places Planned: ${entry.value}`}
              {entry.name === 'completed' && `Places Completed: ${entry.value}`}
              {entry.name === 'completionRate' && `Completion Rate: ${Math.round(entry.value)}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartType === 'bar') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Daily Activity (Last {days} days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#9CA3AF' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="visits" 
              fill="#3B82F6" 
              name="visits"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="completed" 
              fill="#10B981" 
              name="completed"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Visit Trends (Last {days} days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#9CA3AF' }}
          />
          <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#9CA3AF' }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="places"
            stackId="1"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.6}
            name="places"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stackId="1"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.8}
            name="completed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

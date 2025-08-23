// components/amaravati/dashboard/SmartSuggestions.tsx
// AI-powered suggestions for visit planning

'use client';

import React from 'react';
import { Place, Visit } from '@/lib/types/amaravati';
import { 
  Lightbulb, 
  MapPin, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Calendar,
  Route
} from 'lucide-react';

interface SmartSuggestionsProps {
  places: Place[];
  visits: Visit[];
}

interface Suggestion {
  id: string;
  type: 'priority' | 'efficiency' | 'planning' | 'completion';
  title: string;
  description: string;
  action?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  places?: Place[];
}

export default function SmartSuggestions({ places, visits }: SmartSuggestionsProps) {
  // Generate intelligent suggestions based on data analysis
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    
    // 1. High priority unvisited places
    const highPriorityUnvisited = places.filter(p => 
      p.status === 'active' && 
      p.priority === 'High' && 
      p.visitCount === 0
    );
    
    if (highPriorityUnvisited.length > 0) {
      suggestions.push({
        id: 'high-priority',
        type: 'priority',
        title: 'High Priority Places Need Attention',
        description: `You have ${highPriorityUnvisited.length} high-priority places that haven't been visited yet.`,
        action: 'Plan visits for these places',
        icon: AlertTriangle,
        color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
        places: highPriorityUnvisited.slice(0, 3)
      });
    }

    // 2. Places not visited in a while
    const lastVisit = visits.length > 0 ? Math.max(...visits.map(v => new Date(v.date).getTime())) : 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    if (lastVisit < weekAgo && places.some(p => p.status === 'active')) {
      suggestions.push({
        id: 'inactive-week',
        type: 'planning',
        title: 'Time for a Visit',
        description: 'It\'s been over a week since your last visit. Consider planning a new exploration.',
        action: 'Plan today\'s visit',
        icon: Calendar,
        color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
      });
    }

    // 3. Efficiency suggestion - group nearby places
    const activePlaces = places.filter(p => p.status === 'active');
    if (activePlaces.length >= 3) {
      suggestions.push({
        id: 'group-nearby',
        type: 'efficiency',
        title: 'Optimize Your Route',
        description: 'Group nearby places together to save time and improve visit efficiency.',
        action: 'Review location clustering',
        icon: Route,
        color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
      });
    }

    // 4. Completion rate suggestion
    const completedPlaces = places.filter(p => p.visitCount > 0).length;
    const completionRate = activePlaces.length > 0 ? (completedPlaces / activePlaces.length) * 100 : 0;
    
    if (completionRate < 50 && activePlaces.length >= 5) {
      suggestions.push({
        id: 'low-completion',
        type: 'completion',
        title: 'Boost Your Completion Rate',
        description: `Your completion rate is ${Math.round(completionRate)}%. Focus on visiting planned places to improve coverage.`,
        action: 'Focus on unvisited places',
        icon: Target,
        color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
      });
    }

    // 5. Category exploration suggestion
    const categories = Array.from(new Set(places.map(p => p.category).filter(Boolean)));
    if (categories.length > 1) {
      const categoryStats = categories.map(category => {
        const categoryPlaces = places.filter(p => p.category === category);
        const visited = categoryPlaces.filter(p => p.visitCount > 0).length;
        return {
          category,
          total: categoryPlaces.length,
          visited,
          rate: visited / categoryPlaces.length
        };
      });
      
      const leastExplored = categoryStats.sort((a, b) => a.rate - b.rate)[0];
      
      if (leastExplored && leastExplored.rate < 0.3) {
        suggestions.push({
          id: 'explore-category',
          type: 'planning',
          title: `Explore ${leastExplored.category} Places`,
          description: `You've only visited ${Math.round(leastExplored.rate * 100)}% of places in the ${leastExplored.category} category.`,
          action: 'Plan category-focused visit',
          icon: MapPin,
          color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
        });
      }
    }

    // 6. Quick wins suggestion
    const quickWins = places.filter(p => 
      p.status === 'active' && 
      p.visitCount === 0 && 
      p.timeEstimate && 
      parseInt(p.timeEstimate) <= 30
    );
    
    if (quickWins.length >= 3) {
      suggestions.push({
        id: 'quick-wins',
        type: 'efficiency',
        title: 'Quick Wins Available',
        description: `${quickWins.length} places can be visited in 30 minutes or less. Perfect for a short trip.`,
        action: 'Plan quick visit',
        icon: Clock,
        color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
        places: quickWins.slice(0, 3)
      });
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Suggestions
          </h3>
        </div>
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Great job! No immediate suggestions. Keep exploring and adding new places.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Smart Suggestions
        </h3>
      </div>

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-4 rounded-lg border-2 ${suggestion.color}`}
          >
            <div className="flex items-start gap-3">
              <suggestion.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium mb-1">
                  {suggestion.title}
                </h4>
                <p className="text-sm opacity-90 mb-3">
                  {suggestion.description}
                </p>
                
                {suggestion.places && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-2 opacity-75">Suggested places:</p>
                    <div className="space-y-1">
                      {suggestion.places.map(place => (
                        <div key={place.id} className="text-xs opacity-80 flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{place.name}</span>
                          {place.priority && (
                            <span className="px-1 py-0.5 bg-white/20 rounded text-xs">
                              {place.priority}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {suggestion.action && (
                  <button className="text-sm font-medium underline hover:no-underline transition-all">
                    {suggestion.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

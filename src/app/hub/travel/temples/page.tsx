'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTemplePlans } from '@/hooks/useTemplePlans';
import { TempleFilters } from '@/lib/types/temple';
import { TempleCard } from '@/components/temples/TempleCard';
import { TempleFiltersPanel } from '@/components/temples/TempleFiltersPanel';

export default function TemplesPage() {
  const { plans, loading, error } = useTemplePlans();
  const [filters, setFilters] = useState<TempleFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Filter plans based on current filters and search
  const filteredPlans = plans.filter(plan => {
    // Text search
    if (searchTerm && !plan.templeName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !plan.deity?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !plan.address?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0 && !filters.status.includes(plan.status)) {
      return false;
    }

    // Deity filter
    if (filters.deity && plan.deity !== filters.deity) {
      return false;
    }

    // Location filter
    if (filters.location && !plan.address?.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    // Due month/year filter
    if (filters.dueMonth || filters.dueYear) {
      const dueDate = new Date(plan.due.value);
      if (filters.dueMonth && dueDate.getMonth() + 1 !== filters.dueMonth) {
        return false;
      }
      if (filters.dueYear && dueDate.getFullYear() !== filters.dueYear) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const planTags = plan.tags || [];
      if (!filters.tags.some(tag => planTags.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Error Loading Plans</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Temple Vows & Visits</h1>
          <p className="text-gray-600 mt-2">Track your temple visits and spiritual journeys</p>
        </div>
        <Link
          href="/hub/travel/temples/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Add Plan
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search temples, deities, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <TempleFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          plans={plans}
        />
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {plans.length === 0 ? 'No temple plans yet' : 'No plans match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {plans.length === 0 
                ? 'Track your temple vows and visits—start by creating your first plan.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {plans.length === 0 && (
              <Link
                href="/hub/travel/temples/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create your first temple plan
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <TempleCard
              key={plan.id}
              plan={plan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

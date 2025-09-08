import { useState } from 'react';
import { TemplePlan, TempleFilters, PlanStatus } from '@/lib/types/temple';

interface TempleFiltersPanelProps {
  filters: TempleFilters;
  onFiltersChange: (filters: TempleFilters) => void;
  plans: TemplePlan[];
}

export const TempleFiltersPanel = ({ filters, onFiltersChange, plans }: TempleFiltersPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique values from plans for filter options
  const uniqueDeities = [...new Set(plans.map(p => p.deity).filter(Boolean))];
  const uniqueTags = [...new Set(plans.flatMap(p => p.tags || []))];

  const handleStatusChange = (status: PlanStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    const currentTags = filters.tags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);
    
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Boolean(
    (filters.status && filters.status.length > 0) ||
    filters.deity ||
    filters.location ||
    filters.dueMonth ||
    filters.dueYear ||
    (filters.tags && filters.tags.length > 0)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 font-medium"
        >
          <span>Filters</span>
          <svg
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-3">
              {(['PLANNED', 'OVERDUE', 'COMPLETED', 'CANCELLED'] as const).map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(filters.status || []).includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {status.toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Deity Filter */}
          {uniqueDeities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deity</label>
              <select
                value={filters.deity || ''}
                onChange={(e) => onFiltersChange({ ...filters, deity: e.target.value || undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All deities</option>
                {uniqueDeities.map(deity => (
                  <option key={deity} value={deity}>{deity}</option>
                ))}
              </select>
            </div>
          )}

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={filters.location || ''}
              onChange={(e) => onFiltersChange({ ...filters, location: e.target.value || undefined })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Due Date Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Month</label>
              <select
                value={filters.dueMonth || ''}
                onChange={(e) => onFiltersChange({ ...filters, dueMonth: e.target.value ? parseInt(e.target.value) : undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any month</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const monthName = new Date(0, i).toLocaleString('en', { month: 'long' });
                  return (
                    <option key={month} value={month}>{monthName}</option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Year</label>
              <select
                value={filters.dueYear || ''}
                onChange={(e) => onFiltersChange({ ...filters, dueYear: e.target.value ? parseInt(e.target.value) : undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any year</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          {uniqueTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {uniqueTags.map(tag => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(filters.tags || []).includes(tag)}
                      onChange={(e) => handleTagChange(tag, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">#{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

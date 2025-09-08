import Image from 'next/image';
import { TemplePlan } from '@/lib/types/temple';
import { useTemplePlans } from '@/hooks/useTemplePlans';
import { 
  formatMoney, 
  formatDue, 
  calcDaysToDue, 
  getTransportDisplay
} from '@/lib/utils/temple-utils';
import { StatusBadge } from './StatusBadge';
import { BudgetBar } from './BudgetBar';

interface TempleCardProps {
  plan: TemplePlan;
  onClick?: () => void;
  onEdit?: () => void;
}

export const TempleCard = ({ plan, onClick, onEdit }: TempleCardProps) => {
  const { completePlan } = useTemplePlans();
  const daysToDue = calcDaysToDue(plan.due);
  const transport = getTransportDisplay(plan.transportMode);
  
  const handleMarkCompleted = async () => {
    if (!confirm('Mark this temple plan as completed?')) return;
    
    const visitDetails = {
      visitedOn: Date.now(),
      totalSpent: 0, // This could be improved with a form
      experience: 'Visit completed',
      rating: 5,
      goodTimeToVisitNow: true,
    };
    
    await completePlan(plan.id, visitDetails);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div className="aspect-video relative bg-gray-200">
        {plan.coverMedia ? (
          <Image
            src="/api/placeholder/400/200" // This would be the actual media URL
            alt={plan.templeName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🏛️</div>
              <p className="text-sm">No image</p>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={plan.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {plan.templeName}
          </h3>
          {plan.deity && (
            <p className="text-sm text-gray-600">Deity: {plan.deity}</p>
          )}
          {plan.address && (
            <p className="text-xs text-gray-500 truncate">{plan.address}</p>
          )}
        </div>

        {/* Details Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Due Date */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
            Due: {formatDue(plan.due)}
          </span>
          
          {/* Transport */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
            {transport.icon} {transport.text}
          </span>
          
          {/* Solo/Group */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
            {plan.soloOrGroup === 'SOLO' ? '👤 Solo' : '👥 Group'}
          </span>
        </div>

        {/* Budget Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Budget Progress</span>
            <span className="font-medium">{formatMoney(plan.budget.savedSoFar)} / {formatMoney(plan.budget.planned)}</span>
          </div>
          <BudgetBar 
            saved={plan.budget.savedSoFar} 
            planned={plan.budget.planned}
            spent={plan.lastVisit?.totalSpent}
          />
        </div>

        {/* Days to Due */}
        {plan.status === 'PLANNED' && (
          <div className="mb-4">
            {daysToDue > 0 ? (
              <p className="text-sm text-gray-600">
                📅 {daysToDue} days to go
              </p>
            ) : (
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Overdue by {Math.abs(daysToDue)} days
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClick}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded font-medium text-center transition-colors"
          >
            Open
          </button>
          
          {plan.status === 'PLANNED' && (
            <button
              onClick={handleMarkCompleted}
              className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded font-medium transition-colors"
            >
              ✓ Complete
            </button>
          )}
          
          {onEdit && (
            <button
              onClick={onEdit}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {/* Tags */}
        {plan.tags && plan.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {plan.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                #{tag}
              </span>
            ))}
            {plan.tags.length > 3 && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{plan.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

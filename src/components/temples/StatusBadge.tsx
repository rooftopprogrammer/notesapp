import { PlanStatus } from '@/lib/types/temple';
import { getStatusColor } from '@/lib/utils/temple-utils';

interface StatusBadgeProps {
  status: PlanStatus;
  className?: string;
}

export const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  const colorClass = getStatusColor(status);
  
  const statusText = {
    PLANNED: 'Planned',
    OVERDUE: 'Overdue',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }[status];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {statusText}
    </span>
  );
};

interface BudgetBarProps {
  saved: number;
  planned: number;
  spent?: number;
  className?: string;
}

export const BudgetBar = ({ saved, planned, spent, className = '' }: BudgetBarProps) => {
  if (!planned || planned === 0) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No budget set
      </div>
    );
  }

  const savedPercent = Math.min((saved / planned) * 100, 100);
  const spentPercent = spent ? Math.min((spent / planned) * 100, 100) : 0;
  
  return (
    <div className={`space-y-1 ${className}`}>
      {/* Progress Bar */}
      <div className="relative h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        {/* Saved Progress */}
        <div 
          className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${savedPercent}%` }}
        />
        
        {/* Spent Indicator (if completed) */}
        {spent && spent > 0 && (
          <div 
            className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-300 opacity-70"
            style={{ width: `${spentPercent}%` }}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-between text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Saved</span>
          </div>
          {spent && spent > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Spent</span>
            </div>
          )}
        </div>
        <span className="font-medium">
          {Math.round(savedPercent)}%
        </span>
      </div>
    </div>
  );
};

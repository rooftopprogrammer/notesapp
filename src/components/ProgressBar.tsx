// components/ProgressBar.tsx
// Accessible progress bar component for recipe cooking progress

'use client';

import React from 'react';

interface ProgressBarProps {
  /** Current progress percentage (0-100) */
  value: number;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom label for screen readers */
  ariaLabel?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function ProgressBar({
  value,
  min = 0,
  max = 100,
  className = '',
  showPercentage = false,
  ariaLabel,
  size = 'md',
  variant = 'default',
}: ProgressBarProps) {
  // Ensure value is within bounds
  const clampedValue = Math.min(max, Math.max(min, value));
  const percentage = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;

  // Size classes
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Color classes based on variant
  const colorClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  // Auto-determine color based on progress for default variant
  const getProgressColor = () => {
    if (variant !== 'default') return colorClasses[variant];
    
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const progressColor = getProgressColor();

  return (
    <div className={`progress-bar-container ${className}`}>
      {/* Progress bar */}
      <div
        className={`
          w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden
          ${sizeClasses[size]}
        `}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel || `Progress: ${Math.round(percentage)}%`}
      >
        {/* Progress fill */}
        <div
          className={`
            h-full transition-all duration-500 ease-out rounded-full
            ${progressColor}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage text */}
      {showPercentage && (
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 text-center">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

/**
 * Simplified progress bar for sticky headers
 */
export function StickyProgressBar({
  value,
  max = 100,
  className = '',
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={`sticky-progress-bar ${className}`}>
      <div
        className="h-1 bg-gray-200 dark:bg-gray-700"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Overall progress: ${Math.round(percentage)}%`}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 */
export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  className = '',
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Circular progress: ${Math.round(percentage)}%`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// components/Timer.tsx
// Accessible timer widget with drift correction and notifications

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTimerDisplay } from '@/lib/progress';
import { playTimerBeep, showNotification } from '@/lib/recipe-notifications';

interface TimerProps {
  id: string;
  initialSec: number;
  valueSec?: number;
  running?: boolean;
  startedAt?: number;
  onTick?: (remainingSec: number) => void;
  onComplete?: () => void;
  onStateChange?: (state: { remainingSec: number; running: boolean; startedAt?: number }) => void;
  className?: string;
}

export default function Timer({
  id,
  initialSec,
  valueSec = initialSec,
  running = false,
  startedAt,
  onTick,
  onComplete,
  onStateChange,
  className = '',
}: TimerProps) {
  const [remainingSec, setRemainingSec] = useState(valueSec);
  const [isRunning, setIsRunning] = useState(running);
  const [timerStartedAt, setTimerStartedAt] = useState<number | undefined>(startedAt);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Announce timer events for screen readers
  const [announcement, setAnnouncement] = useState('');

  // Calculate remaining time with drift correction
  const calculateRemainingTime = useCallback(() => {
    if (!isRunning || !timerStartedAt) return remainingSec;
    
    const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
    const remaining = Math.max(0, initialSec - elapsed);
    return remaining;
  }, [isRunning, timerStartedAt, initialSec, remainingSec]);

  // Update timer every second with drift correction
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = calculateRemainingTime();
      
      setRemainingSec(remaining);
      onTick?.(remaining);
      
      // Update state for persistence
      onStateChange?.({
        remainingSec: remaining,
        running: isRunning,
        startedAt: timerStartedAt,
      });

      // Check if timer completed
      if (remaining <= 0) {
        setIsRunning(false);
        setAnnouncement('Timer completed');
        
        // Play sound and show notification
        playTimerBeep();
        showNotification({
          title: 'Timer Completed',
          body: `Step timer finished`,
          tag: `timer-${id}`,
        });
        
        onComplete?.();
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      lastTickRef.current = now;
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, calculateRemainingTime, onTick, onComplete, onStateChange, id, timerStartedAt]);

  // Sync external state changes
  useEffect(() => {
    setRemainingSec(valueSec);
  }, [valueSec]);

  useEffect(() => {
    setIsRunning(running);
  }, [running]);

  useEffect(() => {
    setTimerStartedAt(startedAt);
  }, [startedAt]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    const newStartedAt = timerStartedAt ? timerStartedAt : now;
    
    setIsRunning(true);
    setTimerStartedAt(newStartedAt);
    setAnnouncement('Timer started');
    
    onStateChange?.({
      remainingSec,
      running: true,
      startedAt: newStartedAt,
    });
  }, [remainingSec, timerStartedAt, onStateChange]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    setAnnouncement('Timer paused');
    
    // Calculate actual remaining time when pausing
    const actualRemaining = calculateRemainingTime();
    setRemainingSec(actualRemaining);
    
    onStateChange?.({
      remainingSec: actualRemaining,
      running: false,
      startedAt: undefined,
    });
  }, [calculateRemainingTime, onStateChange]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setRemainingSec(initialSec);
    setTimerStartedAt(undefined);
    setAnnouncement('Timer reset');
    
    onStateChange?.({
      remainingSec: initialSec,
      running: false,
      startedAt: undefined,
    });
  }, [initialSec, onStateChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (isRunning) {
          handlePause();
        } else {
          handleStart();
        }
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleReset();
        }
        break;
    }
  }, [isRunning, handleStart, handlePause, handleReset]);

  // Calculate progress for visual indicator
  const progressPercent = initialSec > 0 ? ((initialSec - remainingSec) / initialSec) * 100 : 0;

  return (
    <div className={`timer-widget ${className}`}>
      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Timer display */}
      <div className="text-center">
        <div className="relative inline-block">
          {/* Progress ring */}
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                className={`transition-all duration-1000 ${
                  remainingSec <= 60 
                    ? 'text-red-500' 
                    : remainingSec <= 300 
                    ? 'text-yellow-500' 
                    : 'text-blue-500'
                }`}
              />
            </svg>
            
            {/* Time display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span 
                className={`text-2xl font-mono font-bold ${
                  remainingSec <= 60 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-900 dark:text-white'
                }`}
                aria-label={`Timer showing ${formatTimerDisplay(remainingSec)}`}
              >
                {formatTimerDisplay(remainingSec)}
              </span>
            </div>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex justify-center gap-2">
          <button
            onClick={isRunning ? handlePause : handleStart}
            onKeyDown={handleKeyDown}
            disabled={remainingSec <= 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] ${
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
                : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed'
            }`}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? '⏸️ Pause' : '▶️ Start'}
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 min-h-[44px]"
            aria-label="Reset timer"
          >
            🔄 Reset
          </button>
        </div>

        {/* Timer status */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {remainingSec <= 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✅ Timer completed
            </span>
          ) : isRunning ? (
            <span className="text-blue-600 dark:text-blue-400">
              ⏱️ Running
            </span>
          ) : (
            <span>
              ⏸️ Paused
            </span>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Press Space to start/pause • Ctrl+R to reset
        </div>
      </div>
    </div>
  );
}

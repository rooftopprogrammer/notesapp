'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: Date;
  title?: string;
  description?: string;
}

export default function CountdownTimer({ endDate, title = "Countdown", description }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {description && (
              <p className="text-white/90 text-sm">{description}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 text-center">
          <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
            <div className="text-2xl font-bold">{timeLeft.days}</div>
            <div className="text-xs text-white/80 uppercase tracking-wider">Days</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
            <div className="text-2xl font-bold">{timeLeft.hours}</div>
            <div className="text-xs text-white/80 uppercase tracking-wider">Hours</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
            <div className="text-2xl font-bold">{timeLeft.minutes}</div>
            <div className="text-xs text-white/80 uppercase tracking-wider">Min</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
            <div className="text-2xl font-bold">{timeLeft.seconds}</div>
            <div className="text-xs text-white/80 uppercase tracking-wider">Sec</div>
          </div>
        </div>
      </div>
    </div>
  );
}
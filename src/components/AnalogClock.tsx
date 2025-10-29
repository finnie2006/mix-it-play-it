
import React, { useState, useEffect } from 'react';
import { formatTime, getTimeSettings, TimeSettings } from '@/lib/utils';

export const AnalogClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({ use24Hour: true });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load time settings
  useEffect(() => {
    const loadedTimeSettings = getTimeSettings();
    setTimeSettings(loadedTimeSettings);

    // Listen for storage changes to update time settings in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timeSettings') {
        const newTimeSettings = getTimeSettings();
        setTimeSettings(newTimeSettings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate angles for clock hands
  const secondAngle = (time.getSeconds() * 6) - 90; // 6 degrees per second
  const minuteAngle = (time.getMinutes() * 6 + time.getSeconds() * 0.1) - 90; // 6 degrees per minute
  const hourAngle = ((time.getHours() % 12) * 30 + time.getMinutes() * 0.5) - 90; // 30 degrees per hour

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-64 h-64 bg-slate-900 rounded-full border-4 border-slate-600 shadow-2xl">
        {/* Clock face with hour markers */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* Hour markers */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const x1 = 100 + Math.cos(angle) * 80;
            const y1 = 100 + Math.sin(angle) * 80;
            const x2 = 100 + Math.cos(angle) * 70;
            const y2 = 100 + Math.sin(angle) * 70;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-primary, #10b981)"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Minute markers */}
          {Array.from({ length: 60 }, (_, i) => {
            if (i % 5 !== 0) { // Skip hour positions
              const angle = (i * 6) * (Math.PI / 180);
              const x1 = 100 + Math.cos(angle) * 80;
              const y1 = 100 + Math.sin(angle) * 80;
              const x2 = 100 + Math.cos(angle) * 75;
              const y2 = 100 + Math.sin(angle) * 75;
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--color-primary, #10b981)"
                  strokeWidth="1"
                  opacity="0.6"
                />
              );
            }
            return null;
          })}
          
          {/* Hour hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + Math.cos(hourAngle * Math.PI / 180) * 40}
            y2={100 + Math.sin(hourAngle * Math.PI / 180) * 40}
            stroke="var(--color-primary, #f59e0b)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Minute hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + Math.cos(minuteAngle * Math.PI / 180) * 60}
            y2={100 + Math.sin(minuteAngle * Math.PI / 180) * 60}
            stroke="var(--color-accent, #3b82f6)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Second hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + Math.cos(secondAngle * Math.PI / 180) * 70}
            y2={100 + Math.sin(secondAngle * Math.PI / 180) * 70}
            stroke="var(--color-danger, #ef4444)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          
          {/* Center dot */}
          <circle
            cx="100"
            cy="100"
            r="4"
            fill="var(--color-primary, #10b981)"
          />
        </svg>
      </div>
      
      {/* Digital time display */}
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-green-400">
          {formatTime(time, timeSettings.use24Hour)}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {formatDate(time)}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          System Time
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

export const ClockDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="bg-slate-800/90 border-slate-600 p-8 text-center">
      <div className="relative">
        {/* Clock Circle Background */}
        <div className="w-48 h-48 mx-auto mb-4 relative">
          <div className="absolute inset-0 rounded-full border-4 border-green-400/30 bg-slate-900/80">
            {/* Clock Ticks */}
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="absolute w-1 h-8 bg-green-400/60"
                style={{
                  top: '8px',
                  left: '50%',
                  transformOrigin: '50% 88px',
                  transform: `translateX(-50%) rotate(${i * 30}deg)`
                }}
              />
            ))}
            
            {/* Digital Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-mono font-bold text-white tracking-wider">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-slate-300 mt-2">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-slate-400 font-medium">
          System Time
        </div>
      </div>
    </Card>
  );
};

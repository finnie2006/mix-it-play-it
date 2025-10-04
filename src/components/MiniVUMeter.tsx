import React, { useState, useEffect, useRef } from 'react';

interface MiniVUMeterProps {
  level: number;
  className?: string;
}

export const MiniVUMeter: React.FC<MiniVUMeterProps> = ({ level, className = '' }) => {
  const [peakHold, setPeakHold] = useState(-90);
  const [isShowingPeak, setIsShowingPeak] = useState(false);
  const peakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert dB level to percentage for display
  const normalizeLevel = (db: number) => {
    const minDb = -60;
    const maxDb = 0;
    return Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));
  };

  const percentage = normalizeLevel(level);
  const peakPercentage = normalizeLevel(peakHold);

  // Peak hold logic
  useEffect(() => {
    const currentPercentage = normalizeLevel(level);
    const currentPeakPercentage = normalizeLevel(peakHold);
    
    if (currentPercentage > currentPeakPercentage) {
      setPeakHold(level);
      setIsShowingPeak(true);
      
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }
      
      peakTimeoutRef.current = setTimeout(() => {
        setIsShowingPeak(false);
        setTimeout(() => {
          setPeakHold(-90);
        }, 200);
      }, 1500);
    }
  }, [level, peakHold]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }
    };
  }, []);

  // Determine color based on level
  const getBarColor = (position: number) => {
    if (position > 85) return 'bg-red-500';
    if (position > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Create mini meter segments (smaller version)
  const segmentCount = 8;
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const segmentPosition = ((index + 1) / segmentCount) * 100;
    const isActive = percentage >= segmentPosition;
    
    const segmentThreshold = (index / segmentCount) * 100;
    const nextSegmentThreshold = ((index + 1) / segmentCount) * 100;
    const isPeakHold = isShowingPeak && 
                       peakPercentage > segmentThreshold && 
                       peakPercentage <= nextSegmentThreshold && 
                       peakHold > -60 && 
                       !isActive;
    
    let colorClass;
    if (isPeakHold) {
      const baseColor = getBarColor(peakPercentage);
      colorClass = `${baseColor} ring-1 ring-white/60 brightness-125`;
    } else if (isActive) {
      colorClass = getBarColor(segmentPosition);
    } else {
      colorClass = 'bg-slate-600';
    }
    
    return (
      <div
        key={index}
        className={`h-1 w-full mb-0.5 rounded-sm transition-colors duration-200 ${colorClass}`}
      />
    );
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex flex-col-reverse space-y-reverse space-y-0.5 h-10 w-2 bg-slate-800 rounded border border-slate-600 p-0.5">
        {segments}
      </div>
    </div>
  );
};
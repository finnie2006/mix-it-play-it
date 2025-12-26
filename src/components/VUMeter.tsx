import React, { useState, useEffect, useRef } from 'react';

interface VUMeterProps {
  level: number;
  label: string;
  className?: string;
  height?: 'normal' | 'tall' | 'extra-tall';
  showScale?: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({ level, label, className = '', height = 'normal', showScale = true }) => {
  const [peakHold, setPeakHold] = useState(-90); // Initialize to minimum dB level
  const [isShowingPeak, setIsShowingPeak] = useState(false);
  const peakTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPeakTimeRef = useRef<number>(0);

  // Convert dB level to percentage for display
  // Professional broadcast range: -50dB to +5dB
  const normalizeLevel = (db: number) => {
    const minDb = -50;
    const maxDb = 5;
    const normalized = Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));
    return normalized;
  };

  const percentage = normalizeLevel(level);
  const peakPercentage = normalizeLevel(peakHold);

  // Peak hold logic with guaranteed 2-second reset
  useEffect(() => {
    const currentPercentage = normalizeLevel(level);
    const currentPeakPercentage = normalizeLevel(peakHold);
    const now = Date.now();
    
    // Only update peak if current level is higher than stored peak
    if (currentPercentage > currentPeakPercentage) {
      setPeakHold(level);
      setIsShowingPeak(true);
      lastPeakTimeRef.current = now;
      
      // Clear existing timeout to prevent multiple timers
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }
      
      // Set timeout to reset after exactly 2 seconds
      peakTimeoutRef.current = setTimeout(() => {
        setIsShowingPeak(false);
        // Add small delay for smooth visual transition
        setTimeout(() => {
          setPeakHold(-90);
        }, 200);
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Additional timer to ensure peak always resets after 2 seconds
  useEffect(() => {
    if (isShowingPeak) {
      const checkReset = () => {
        const timeSinceLastPeak = Date.now() - lastPeakTimeRef.current;
        if (timeSinceLastPeak >= 2000) {
          setIsShowingPeak(false);
          setTimeout(() => {
            setPeakHold(-90);
          }, 200);
        }
      };

      // Check every 100ms to ensure timely reset
      const intervalId = setInterval(checkReset, 100);
      
      return () => clearInterval(intervalId);
    }
  }, [isShowingPeak, peakHold]);

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
    if (position > 85) return 'bg-red-500'; // Peak/danger zone
    if (position > 70) return 'bg-yellow-500'; // Warning zone
    return 'bg-green-500'; // Safe zone
  };

  // Get height and segment count based on height prop
  const getHeightConfig = () => {
    switch (height) {
      case 'tall':
        return { segments: 30, heightClass: 'h-72', segmentHeight: 'h-2' };
      case 'extra-tall':
        return { segments: 40, heightClass: 'h-96', segmentHeight: 'h-2' };
      default:
        return { segments: 20, heightClass: 'h-48', segmentHeight: 'h-2' };
    }
  };

  const { segments: segmentCount, heightClass, segmentHeight } = getHeightConfig();

  // Create meter segments
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const segmentPosition = ((index + 1) / segmentCount) * 100; // Each segment represents a percentage
    const isActive = percentage >= segmentPosition;
    
    // Check if this segment should show the peak hold
    // We want to light up the segment that corresponds to the peak level
    const segmentThreshold = (index / segmentCount) * 100;
    const nextSegmentThreshold = ((index + 1) / segmentCount) * 100;
    const isPeakHold = isShowingPeak && 
                       peakPercentage > segmentThreshold && 
                       peakPercentage <= nextSegmentThreshold && 
                       peakHold > -50 && 
                       !isActive; // Only show peak hold if segment is not already active
    
    let colorClass;
    if (isPeakHold) {
      // Peak hold indicator - subtle but visible styling
      const baseColor = getBarColor(peakPercentage);
      colorClass = `${baseColor} ring-1 ring-white/60 brightness-125 transition-all duration-500 ease-out`;
    } else if (isActive) {
      colorClass = getBarColor(segmentPosition);
    } else {
      colorClass = 'bg-slate-700';
    }
    
    return (
      <div
        key={index}
        className={`${segmentHeight} w-full mb-1 rounded-sm transition-all duration-300 ease-out ${colorClass}`}
      />
    );
  });

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <div className="text-xs font-mono text-slate-300 text-center min-h-[2rem] flex items-center">
        {label}
      </div>
      
      <div className="relative flex justify-center">
        <div className={`flex flex-col-reverse space-y-reverse space-y-1 ${heightClass} w-6 p-1 bg-slate-800 rounded border border-slate-600`}>
          {segments}
        </div>
        
        {/* dB scale markers - positioned to the left of the meter */}
        {showScale && (
          <div className={`absolute -left-10 top-0 ${heightClass} w-9 pointer-events-none`}>
            <div className="relative h-full text-[10px] text-slate-500 font-mono">
              <div className="absolute" style={{ top: '0%', transform: 'translateY(-50%)' }}>+5</div>
              <div className="absolute" style={{ top: '9.09%', transform: 'translateY(-50%)' }}>0</div>
              <div className="absolute" style={{ top: '18.18%', transform: 'translateY(-50%)' }}>-5</div>
              <div className="absolute" style={{ top: '27.27%', transform: 'translateY(-50%)' }}>-10</div>
              <div className="absolute" style={{ top: '36.36%', transform: 'translateY(-50%)' }}>-15</div>
              <div className="absolute" style={{ top: '45.45%', transform: 'translateY(-50%)' }}>-20</div>
              <div className="absolute" style={{ top: '54.54%', transform: 'translateY(-50%)' }}>-25</div>
              <div className="absolute" style={{ top: '63.64%', transform: 'translateY(-50%)' }}>-30</div>
              <div className="absolute" style={{ top: '81.82%', transform: 'translateY(-50%)' }}>-40</div>
              <div className="absolute" style={{ top: '100%', transform: 'translateY(-50%)' }}>-50</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs font-mono text-slate-400 text-center">
        {level > -50 ? `${level.toFixed(1)}` : '-∞'}
      </div>
    </div>
  );
};

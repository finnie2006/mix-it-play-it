
import React from 'react';

interface VUMeterProps {
  level: number;
  label: string;
  className?: string;
}

export const VUMeter: React.FC<VUMeterProps> = ({ level, label, className = '' }) => {
  // Convert dB level to percentage for display
  // Typical range is -60dB to 0dB, so we'll map this to 0-100%
  const normalizeLevel = (db: number) => {
    const minDb = -60;
    const maxDb = 0;
    const normalized = Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));
    return normalized;
  };

  const percentage = normalizeLevel(level);
  
  // Determine color based on level
  const getBarColor = (position: number) => {
    if (position > 85) return 'bg-red-500'; // Peak/danger zone
    if (position > 70) return 'bg-yellow-500'; // Warning zone
    return 'bg-green-500'; // Safe zone
  };

  // Create meter segments
  const segments = Array.from({ length: 20 }, (_, index) => {
    const segmentPosition = (index + 1) * 5; // Each segment represents 5%
    const isActive = percentage >= segmentPosition;
    const colorClass = isActive ? getBarColor(segmentPosition) : 'bg-slate-700';
    
    return (
      <div
        key={index}
        className={`h-2 w-full mb-1 rounded-sm transition-colors duration-75 ${colorClass}`}
      />
    );
  });

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <div className="text-xs font-mono text-slate-300 text-center min-h-[2rem] flex items-center">
        {label}
      </div>
      
      <div className="flex flex-col-reverse space-y-reverse space-y-1 h-48 w-6 p-1 bg-slate-800 rounded border border-slate-600">
        {segments}
      </div>
      
      <div className="text-xs font-mono text-slate-400 text-center">
        {level > -60 ? `${level.toFixed(1)}` : '-∞'}
      </div>
      
      {/* dB scale markers */}
      <div className="absolute left-0 top-0 h-48 w-8 pointer-events-none">
        <div className="relative h-full">
          <div className="absolute top-0 left-0 text-xs text-slate-500">0</div>
          <div className="absolute top-1/4 left-0 text-xs text-slate-500">-15</div>
          <div className="absolute top-2/4 left-0 text-xs text-slate-500">-30</div>
          <div className="absolute top-3/4 left-0 text-xs text-slate-500">-45</div>
          <div className="absolute bottom-0 left-0 text-xs text-slate-500">-60</div>
        </div>
      </div>
    </div>
  );
};

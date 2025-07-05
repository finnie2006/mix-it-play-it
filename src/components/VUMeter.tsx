import React from 'react';

interface VUMeterProps {
  level: number;
  label: string;
  className?: string;
  height?: 'normal' | 'tall' | 'extra-tall';
}

export const VUMeter: React.FC<VUMeterProps> = ({ level, label, className = '', height = 'normal' }) => {
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
    const colorClass = isActive ? getBarColor(segmentPosition) : 'bg-slate-700';
    
    return (
      <div
        key={index}
        className={`${segmentHeight} w-full mb-1 rounded-sm transition-colors duration-75 ${colorClass}`}
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
        <div className={`absolute -left-8 top-0 ${heightClass} w-6 pointer-events-none`}>
          <div className="relative h-full text-xs text-slate-500">
            <div className="absolute top-0 left-0">0</div>
            <div className="absolute top-1/4 left-0">-15</div>
            <div className="absolute top-2/4 left-0">-30</div>
            <div className="absolute top-3/4 left-0">-45</div>
            <div className="absolute bottom-0 left-0">-60</div>
          </div>
        </div>
      </div>
      
      <div className="text-xs font-mono text-slate-400 text-center">
        {level > -60 ? `${level.toFixed(1)}` : '-∞'}
      </div>
    </div>
  );
};

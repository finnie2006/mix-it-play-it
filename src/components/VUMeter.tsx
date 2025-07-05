
import React from 'react';
import { Card } from '@/components/ui/card';

interface VUMeterProps {
  label: string;
  level: number; // dB value
  isProgram?: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({ 
  label, 
  level, 
  isProgram = false 
}) => {
  // Convert dB to percentage for display (assuming -60dB to 0dB range)
  const percentage = Math.max(0, Math.min(100, ((level + 60) / 60) * 100));
  
  // Determine color based on level
  const getBarColor = (barLevel: number) => {
    if (barLevel > 85) return 'bg-red-500';
    if (barLevel > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Generate meter bars (vertical segments)
  const meterBars = Array.from({ length: 20 }, (_, i) => {
    const barLevel = ((19 - i) / 19) * 100;
    const isActive = percentage >= barLevel;
    
    return (
      <div
        key={i}
        className={`h-3 w-full mb-1 rounded-sm transition-all duration-75 ${
          isActive 
            ? getBarColor(barLevel)
            : 'bg-slate-700/50'
        }`}
      />
    );
  });

  return (
    <Card className={`bg-slate-800/90 border-slate-600 p-4 ${
      isProgram ? 'border-green-400/50' : ''
    }`}>
      <div className="text-center mb-3">
        <div className={`text-sm font-semibold ${
          isProgram ? 'text-green-400' : 'text-white'
        }`}>
          {label}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {level > -60 ? `${level.toFixed(1)} dB` : '-∞ dB'}
        </div>
      </div>
      
      <div className="flex flex-col h-64 justify-end">
        {meterBars}
      </div>
      
      {/* Peak indicators */}
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>0</span>
        <span>-20</span>
        <span>-∞</span>
      </div>
    </Card>
  );
};

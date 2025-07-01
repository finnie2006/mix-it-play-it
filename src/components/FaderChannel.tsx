
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, Volume2, Settings } from 'lucide-react';

interface FaderChannelProps {
  channel: number;
  value: number;
  isActive: boolean;
  config?: {
    action: string;
    radioSoftware: string;
    playerCommand: string;
    threshold: number;
    enabled: boolean;
    description: string;
  };
}

export const FaderChannel: React.FC<FaderChannelProps> = ({ 
  channel, 
  value, 
  isActive,
  config
}) => {
  const hasConfig = config && config.enabled;
  
  return (
    <Card className={`p-4 transition-all duration-300 ${
      isActive 
        ? 'bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/50 shadow-lg shadow-green-500/20' 
        : 'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className={isActive ? 'text-green-400' : 'text-slate-400'} />
          <span className="font-semibold text-white">Ch {channel}</span>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'} className={
          isActive ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
        }>
          {isActive ? 'ACTIVE' : 'IDLE'}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Fader Position</span>
            <span className="text-white font-mono">{Math.round(value)}%</span>
          </div>
          <Progress 
            value={value} 
            className="h-2"
          />
          <div className="text-xs text-slate-500 mt-1">
            Shows physical fader position, not input level
          </div>
        </div>

        {hasConfig ? (
          <div className="space-y-2 text-sm">
            <div className="text-slate-300 font-medium">{config.description}</div>
            <div className="flex items-center gap-2">
              <Play size={14} className="text-blue-400" />
              <span className="text-slate-300">{config.action}</span>
            </div>
            <div className="text-slate-500">
              Target: {config.radioSoftware}
            </div>
            <div className="text-xs text-slate-400">
              Trigger at: {config.threshold}%
            </div>
            <div className="text-xs font-mono text-slate-600 bg-slate-900/50 p-1 rounded">
              {config.playerCommand}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Settings size={14} />
              <span>Not configured</span>
            </div>
            <div className="text-xs text-slate-500">
              Configure this fader in the Configuration tab
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};


import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Settings, Play, Pause, Plus } from 'lucide-react';
import { faderMappingService } from '@/services/faderMappingService';
import { MiniVUMeter } from './MiniVUMeter';

interface FaderChannelProps {
  channel: number;
  value: number;
  isActive: boolean;
  isMuted?: boolean;
  commandExecuted?: boolean;
  vuLevel?: number;
  onConfigureClick?: (channel: number) => void;
}

export const FaderChannel: React.FC<FaderChannelProps> = ({ 
  channel, 
  value, 
  isActive,
  isMuted = false,
  commandExecuted = false,
  vuLevel = -90,
  onConfigureClick
}) => {
  const mapping = faderMappingService.getMappingForChannel(channel);
  const hasMapping = mapping !== undefined;
  const faderState = faderMappingService.getFaderState(channel);
  
  // Determine if this channel should show as active based on mapping threshold
  const isAboveThreshold = hasMapping && value >= mapping.threshold;
  const showAsActive = hasMapping ? isAboveThreshold : isActive;
  
  // Determine status based on command content
  const getCommandStatus = () => {
    if (!hasMapping || !mapping.command) return null;
    
    const command = mapping.command.toLowerCase();
    if (command.includes('play')) {
      return showAsActive ? 'PLAYING' : 'STOPPED';
    } else if (command.includes('pause')) {
      return showAsActive ? 'PAUSED' : 'READY';
    } else if (command.includes('stop')) {
      return showAsActive ? 'STOPPED' : 'READY';
    }
    return showAsActive ? 'ACTIVE' : 'IDLE';
  };

  const commandStatus = getCommandStatus();
  
  return (
    <Card className={`p-4 transition-all duration-300 ${
      showAsActive 
        ? 'bg-slate-700/80 border-green-500/50 shadow-lg shadow-green-500/20' 
        : 'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isMuted ? (
            <VolumeX size={16} className="text-red-400" />
          ) : (
            <Volume2 size={16} className={showAsActive ? 'text-green-400' : 'text-slate-400'} />
          )}
          <span className="font-semibold text-white">
            Ch {channel}
            {mapping?.isStereo && channel === mapping.channel && " (L)"}
            {mapping?.isStereo && channel === mapping.channel + 1 && " (R)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini VU Meter */}
          <MiniVUMeter level={vuLevel} className="opacity-80" />
          
          <div className="flex gap-2">
            {commandStatus && (
              <Badge variant={showAsActive ? 'default' : 'secondary'} className={
                showAsActive ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
              }>
                {commandStatus === 'PLAYING' && <Play size={12} className="mr-1" />}
                {commandStatus === 'PAUSED' && <Pause size={12} className="mr-1" />}
                {commandStatus}
              </Badge>
            )}
            {isMuted && (
              <Badge variant="destructive" className="bg-red-600 text-white">
                MUTED
              </Badge>
            )}
          </div>
        </div>
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
          {hasMapping && (
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Threshold: {mapping.threshold}%</span>
              <span className={value >= mapping.threshold ? 'text-green-400' : 'text-slate-500'}>
                {value >= mapping.threshold ? '✓ Above' : '✗ Below'}
              </span>
            </div>
          )}
        </div>

        {hasMapping ? (
          <div className="space-y-3 text-sm">
            <div className="text-slate-300 font-medium">{mapping.description}</div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-blue-400" />
                <span className="text-slate-300">
                  Trigger at {mapping.threshold}%
                  {mapping.isStereo && " (Stereo)"}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-600 bg-slate-900/50 p-2 rounded">
                {mapping.command}
              </div>
              {faderState?.lastTriggered && (
                <div className="text-xs text-green-400">
                  Last triggered: {new Date(faderState.lastTriggered).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg bg-slate-800/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConfigureClick?.(channel)}
                className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Plus size={16} />
                Configure Fader
              </Button>
            </div>
            <div className="text-xs text-slate-500 text-center">
              Click to map this fader to a radio command
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

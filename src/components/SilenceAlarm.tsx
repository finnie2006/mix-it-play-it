import React, { useState, useEffect } from 'react';
import { silenceDetectionService, SilenceAlarmState } from '@/services/silenceDetectionService';
import { AlertTriangle, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SilenceAlarm: React.FC = () => {
  const [alarmState, setAlarmState] = useState<SilenceAlarmState>({
    isActive: false,
    silenceDuration: 0,
    lastAudioTime: Date.now(),
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = silenceDetectionService.onAlarmChange((state) => {
      setAlarmState(state);
      // Reset dismissed state when alarm clears
      if (!state.isActive) {
        setIsDismissed(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleAcknowledge = () => {
    silenceDetectionService.acknowledgeAlarm();
    setIsDismissed(true);
  };

  // Don't show if not active or if dismissed
  if (!alarmState.isActive || isDismissed) {
    return null;
  }

  const silenceDurationSeconds = Math.floor(alarmState.silenceDuration / 1000);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-red-600 border-2 border-red-400 rounded-lg shadow-2xl px-6 py-4 min-w-[400px] animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-white animate-bounce" size={32} />
            <div>
              <h3 className="text-white font-bold text-lg">SILENCE DETECTED!</h3>
              <p className="text-red-100 text-sm">
                No audio for {silenceDurationSeconds} seconds
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleAcknowledge}
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30"
            >
              <Volume2 size={16} className="mr-2" />
              Acknowledge
            </Button>
            <Button
              onClick={handleAcknowledge}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

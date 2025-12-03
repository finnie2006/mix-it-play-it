import React from 'react';

interface DynamicsMeterStripProps {
  channelNumber: number;
  channelName?: string;
  gateReduction: number; // dB of gain reduction (0 to -60)
  compReduction: number; // dB of gain reduction (0 to -60)
}

export const DynamicsMeterStrip: React.FC<DynamicsMeterStripProps> = ({
  channelNumber,
  channelName,
  gateReduction,
  compReduction,
}) => {
  // Convert dB reduction to percentage for display (0dB = 0%, -60dB = 100%)
  const gatePercent = Math.min(100, Math.max(0, Math.abs(gateReduction) / 60 * 100));
  const compPercent = Math.min(100, Math.max(0, Math.abs(compReduction) / 60 * 100));

  return (
    <div className="flex flex-col items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700">
      {/* Channel Label */}
      <div className="text-center">
        <div className="text-xs font-semibold text-slate-300">
          {channelName || `Ch ${channelNumber}`}
        </div>
      </div>

      <div className="flex gap-3">
        {/* Gate Meter */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400 font-medium">GATE</span>
          <div className="relative w-8 h-24 bg-slate-900 rounded border border-slate-600">
            {/* Gate reduction bar (fills from bottom) */}
            <div
              className="absolute bottom-0 w-full rounded transition-all duration-75"
              style={{
                height: `${gatePercent}%`,
                backgroundColor:
                  gatePercent > 75
                    ? '#ef4444' // red for heavy gating
                    : gatePercent > 50
                    ? '#f59e0b' // amber for moderate
                    : gatePercent > 25
                    ? '#eab308' // yellow for light
                    : '#22c55e', // green for minimal
              }}
            />
            {/* Scale markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
              <div className="h-px bg-slate-600 mx-1" title="0dB" />
              <div className="h-px bg-slate-700 mx-1" title="-15dB" />
              <div className="h-px bg-slate-600 mx-1" title="-30dB" />
              <div className="h-px bg-slate-700 mx-1" title="-45dB" />
              <div className="h-px bg-slate-600 mx-1" title="-60dB" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {gateReduction > -1 ? '0' : gateReduction.toFixed(0)}
          </span>
        </div>

        {/* Compressor Meter */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400 font-medium">COMP</span>
          <div className="relative w-8 h-24 bg-slate-900 rounded border border-slate-600">
            {/* Compression reduction bar (fills from bottom) */}
            <div
              className="absolute bottom-0 w-full rounded transition-all duration-75"
              style={{
                height: `${compPercent}%`,
                backgroundColor:
                  compPercent > 75
                    ? '#ef4444' // red for heavy compression
                    : compPercent > 50
                    ? '#f59e0b' // amber for moderate
                    : compPercent > 25
                    ? '#3b82f6' // blue for light
                    : '#22c55e', // green for minimal
              }}
            />
            {/* Scale markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
              <div className="h-px bg-slate-600 mx-1" title="0dB" />
              <div className="h-px bg-slate-700 mx-1" title="-15dB" />
              <div className="h-px bg-slate-600 mx-1" title="-30dB" />
              <div className="h-px bg-slate-700 mx-1" title="-45dB" />
              <div className="h-px bg-slate-600 mx-1" title="-60dB" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {compReduction > -1 ? '0' : compReduction.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
};

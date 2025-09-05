import React from 'react';
import { Radio, Volume2, Waves } from 'lucide-react';

interface LoadingScreenProps {
  isVisible: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-400 via-transparent to-transparent"></div>
      </div>
      
      <div className="relative flex flex-col items-center justify-center space-y-8">
        {/* Logo and animated elements */}
        <div className="relative">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping scale-150"></div>
          
          {/* Middle rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-green-400/50 animate-spin scale-125">
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1"></div>
          </div>
          
          {/* Main logo container */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
            <Radio className="text-white" size={40} />
          </div>
        </div>

        {/* App title with typewriter effect */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white animate-pulse">
            X-Air Radio Mode
          </h1>
          <p className="text-slate-300 text-lg">
            Professional X-Air Control
          </p>
        </div>

        {/* Loading progress indicator */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-loading-bar"></div>
          </div>
          
          <p className="text-slate-400 text-sm">Initializing...</p>
        </div>

        {/* Audio visualization bars */}
        <div className="flex items-end space-x-1 opacity-60">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="w-2 bg-green-400 rounded-t audio-bar"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

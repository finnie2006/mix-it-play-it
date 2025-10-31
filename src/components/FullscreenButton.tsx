import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

declare global {
  interface Window {
    electronAPI?: {
      fullscreen: {
        setFullscreen: (enabled: boolean) => Promise<{ success: boolean }>;
        getState: () => Promise<{ isFullScreen: boolean }>;
        onRequestExit: (callback: () => void) => void;
        onFullscreenChanged: (callback: (event: any, isFullScreen: boolean) => void) => void;
      };
    };
  }
}

export const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (isElectron) {
      // Electron fullscreen handling
      const checkElectronFullscreen = async () => {
        const state = await window.electronAPI!.fullscreen.getState();
        setIsFullscreen(state.isFullScreen);
      };

      checkElectronFullscreen();

      // Listen for fullscreen changes from Electron
      const handleElectronFullscreenChange = (_event: any, isFullScreen: boolean) => {
        setIsFullscreen(isFullScreen);
      };

      window.electronAPI!.fullscreen.onFullscreenChanged(handleElectronFullscreenChange);
    } else {
      // Browser fullscreen handling
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
  }, [isElectron]);

  const toggleFullscreen = async () => {
    try {
      if (isElectron) {
        // Use Electron API
        await window.electronAPI!.fullscreen.setFullscreen(!isFullscreen);
      } else {
        // Use browser Fullscreen API
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.log('Fullscreen not supported or failed:', error);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="gap-2"
        >
          {isFullscreen ? (
            <>
              <Minimize size={16} />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize size={16} />
              Fullscreen
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Press F11 or Escape to toggle fullscreen</p>
      </TooltipContent>
    </Tooltip>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PasswordUnlockModal } from '@/components/PasswordUnlockModal';

declare global {
  interface Window {
    electronAPI?: {
      fullscreen: {
        setFullscreen: (enabled: boolean) => Promise<{ success: boolean }>;
        getState: () => Promise<{ isFullScreen: boolean }>;
        setPasswordProtectionState: (enabled: boolean) => Promise<{ success: boolean }>;
        onRequestExit: (callback: () => void) => void;
        onFullscreenChanged: (callback: (event: any, isFullScreen: boolean) => void) => void;
      };
    };
  }
}

interface FullscreenButtonProps {
  endUserMode?: boolean;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ endUserMode = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Load password protection settings
  useEffect(() => {
    const loadPasswordSettings = () => {
      const savedSettings = localStorage.getItem('advancedSettings');
      
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const hasPassword = settings.password && settings.password.trim() !== '';
          const isEnabled = settings.passwordProtectionEnabled && hasPassword;
          
          setPasswordProtectionEnabled(isEnabled);
          setSavedPassword(settings.password || '');
          
          // Notify Electron of password protection state
          if (isElectron && window.electronAPI?.fullscreen.setPasswordProtectionState) {
            window.electronAPI.fullscreen.setPasswordProtectionState(isEnabled && endUserMode);
          }
        } catch (error) {
          console.error('Failed to parse settings:', error);
        }
      }
    };

    loadPasswordSettings();
    
    // Listen for settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'advancedSettings') {
        loadPasswordSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isElectron, endUserMode]);

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

      // Listen for fullscreen exit requests (from F11/Escape) when in Electron
      const handleElectronRequestExit = () => {
        if (endUserMode && passwordProtectionEnabled) {
          setIsPasswordModalOpen(true);
        } else {
          window.electronAPI!.fullscreen.setFullscreen(false);
        }
      };

      window.electronAPI!.fullscreen.onFullscreenChanged(handleElectronFullscreenChange);
      window.electronAPI!.fullscreen.onRequestExit(handleElectronRequestExit);
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
  }, [isElectron, endUserMode, passwordProtectionEnabled]);

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        // Exiting fullscreen - check password protection
        if (endUserMode && passwordProtectionEnabled) {
          console.log('FullscreenButton: Password protected, showing modal');
          setIsPasswordModalOpen(true);
          return; // Don't exit yet, wait for password verification
        }
      }

      // Either entering fullscreen or exiting without password protection
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

  // Handle password verification
  const handlePasswordSubmit = async (enteredPassword: string): Promise<boolean> => {
    if (enteredPassword === savedPassword) {
      setIsPasswordModalOpen(false);
      
      // Exit fullscreen after successful password verification
      if (isElectron) {
        await window.electronAPI!.fullscreen.setFullscreen(false);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      
      return true;
    } else {
      return false;
    }
  };

  return (
    <>
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

      {/* Password unlock modal */}
      <PasswordUnlockModal
        isOpen={isPasswordModalOpen}
        onUnlock={handlePasswordSubmit}
        onClose={() => setIsPasswordModalOpen(false)}
        allowClose={false} // Don't allow closing without password in locked mode
      />
    </>
  );
};

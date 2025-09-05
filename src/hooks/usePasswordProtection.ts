import { useState, useEffect, useCallback } from 'react';

interface PasswordProtectionSettings {
  enabled: boolean;
  password: string;
}

export const usePasswordProtection = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [settings, setSettings] = useState<PasswordProtectionSettings>({
    enabled: false,
    password: '',
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          enabled: parsed.passwordProtectionEnabled || false,
          password: parsed.password || '',
        });
      } catch (error) {
        console.error('Failed to load password protection settings:', error);
      }
    }
  }, []);

  // Lock the interface when entering fullscreen on VU meters tab
  const lockInterface = useCallback(() => {
    if (settings.enabled && settings.password) {
      setIsLocked(true);
    }
  }, [settings.enabled, settings.password]);

  // Unlock the interface with password verification
  const unlockInterface = useCallback((enteredPassword: string): boolean => {
    if (enteredPassword === settings.password) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [settings.password]);

  // Handle fullscreen exit - this will trigger the password prompt
  const handleFullscreenExit = useCallback(() => {
    if (settings.enabled && !document.fullscreenElement) {
      // Only lock if we were previously in fullscreen and protection is enabled
      setIsLocked(true);
    }
  }, [settings.enabled]);

  // Update settings
  const updateSettings = useCallback((enabled: boolean, password: string) => {
    setSettings({ enabled, password });
    if (!enabled) {
      setIsLocked(false);
    }
  }, []);

  // Force unlock (for admin purposes)
  const forceUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  return {
    isLocked,
    isProtectionEnabled: settings.enabled,
    lockInterface,
    unlockInterface,
    handleFullscreenExit,
    updateSettings,
    forceUnlock,
  };
};

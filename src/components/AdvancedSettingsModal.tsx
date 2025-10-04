import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PasswordUnlockModal } from '@/components/PasswordUnlockModal';
import { Settings, Shield, Eye, EyeOff, Save, Wifi, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTimeSettings, saveTimeSettings, TimeSettings } from '@/lib/utils';

interface AdvancedSettingsModalProps {
  onPasswordProtectionChange?: (enabled: boolean, password: string) => void;
  onAutoConnectChange?: (enabled: boolean, ip: string) => void;
  onTimeSettingsChange?: (settings: TimeSettings) => void;
}

export const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  onPasswordProtectionChange,
  onAutoConnectChange,
  onTimeSettingsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(false);
  const [autoConnectIP, setAutoConnectIP] = useState('192.168.1.10');
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({ use24Hour: true });
  const { toast } = useToast();

  // Check if password protection is enabled for this modal
  const checkPasswordRequired = () => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings.passwordProtectionEnabled && settings.password;
      } catch (error) {
        return false;
      }
    }
    return false;
  };

  // Handle opening the modal
  const handleOpenModal = () => {
    if (checkPasswordRequired()) {
      setIsUnlocked(false);
    } else {
      setIsUnlocked(true);
    }
    setIsOpen(true);
  };

  // Handle password unlock for settings access
  const handleSettingsUnlock = (enteredPassword: string): boolean => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (enteredPassword === settings.password) {
          setIsUnlocked(true);
          return true;
        }
      } catch (error) {
        // Handle error
      }
    }
    return false;
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setPasswordProtectionEnabled(settings.passwordProtectionEnabled || false);
        setPassword(settings.password || '');
        setConfirmPassword(settings.password || '');
        setAutoConnectEnabled(settings.autoConnectEnabled || false);
        setAutoConnectIP(settings.autoConnectIP || '192.168.1.10');
      } catch (error) {
        console.error('Failed to load advanced settings:', error);
      }
    }

    // Load time settings
    const loadedTimeSettings = getTimeSettings();
    setTimeSettings(loadedTimeSettings);
  }, []);

  const saveSettings = () => {
    if (passwordProtectionEnabled) {
      if (!password.trim()) {
        toast({
          title: "Password Required",
          description: "Please enter a password to enable protection.",
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (password.length < 4) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 4 characters long.",
          variant: "destructive",
        });
        return;
      }
    }

    if (autoConnectEnabled && !autoConnectIP.trim()) {
      toast({
        title: "IP Address Required",
        description: "Please enter an IP address for auto-connect.",
        variant: "destructive",
      });
      return;
    }

    // Validate IP format if auto-connect is enabled
    if (autoConnectEnabled) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(autoConnectIP.trim())) {
        toast({
          title: "Invalid IP Address",
          description: "Please enter a valid IP address (e.g., 192.168.1.10).",
          variant: "destructive",
        });
        return;
      }
    }

    // Save to localStorage
    const settings = {
      passwordProtectionEnabled,
      password: passwordProtectionEnabled ? password : '',
      autoConnectEnabled,
      autoConnectIP: autoConnectEnabled ? autoConnectIP.trim() : '',
    };

    localStorage.setItem('advancedSettings', JSON.stringify(settings));

    // Save time settings separately
    saveTimeSettings(timeSettings);

    // Notify parent components
    if (onPasswordProtectionChange) {
      onPasswordProtectionChange(passwordProtectionEnabled, passwordProtectionEnabled ? password : '');
    }
    
    if (onAutoConnectChange) {
      onAutoConnectChange(autoConnectEnabled, autoConnectEnabled ? autoConnectIP.trim() : '');
    }

    if (onTimeSettingsChange) {
      onTimeSettingsChange(timeSettings);
    }

    toast({
      title: "Settings Saved",
      description: "Advanced settings have been saved successfully.",
    });

    setIsOpen(false);
  };

  const handlePasswordProtectionToggle = (enabled: boolean) => {
    setPasswordProtectionEnabled(enabled);
    if (!enabled) {
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-white"
        onClick={handleOpenModal}
      >
        <Settings size={16} />
        Advanced
      </Button>

      {/* Password unlock modal - separate from settings modal */}
      {isOpen && !isUnlocked && (
        <PasswordUnlockModal
          isOpen={true}
          onUnlock={handleSettingsUnlock}
          onClose={() => setIsOpen(false)}
          allowClose={true}
        />
      )}

      {/* Settings modal - only show when unlocked */}
      <Dialog open={isOpen && isUnlocked} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Settings size={20} />
              Advanced Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Time Format Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Clock size={16} />
                    Time Format
                  </Label>
                  <p className="text-xs text-slate-400">
                    Choose between 12-hour and 24-hour time display
                  </p>
                </div>
              </div>

              <div className="space-y-2 pl-6 border-l-2 border-slate-600">
                <div className="flex gap-2">
                  <Button
                    variant={timeSettings.use24Hour ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeSettings({ use24Hour: true })}
                    className={timeSettings.use24Hour 
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500" 
                      : "border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-300"
                    }
                  >
                    24-Hour (23:45:30)
                  </Button>
                  <Button
                    variant={!timeSettings.use24Hour ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeSettings({ use24Hour: false })}
                    className={!timeSettings.use24Hour 
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500" 
                      : "border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-300"
                    }
                  >
                    12-Hour (11:45:30 PM)
                  </Button>
                </div>
              </div>
            </div>

            {/* Auto Connect Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Wifi size={16} />
                    Auto Connect
                  </Label>
                  <p className="text-xs text-slate-400">
                    Automatically connect to mixer on app startup
                  </p>
                </div>
                <Switch
                  checked={autoConnectEnabled}
                  onCheckedChange={setAutoConnectEnabled}
                />
              </div>

              {autoConnectEnabled && (
                <div className="space-y-2 pl-6 border-l-2 border-slate-600">
                  <Label htmlFor="autoConnectIP" className="text-sm text-slate-200">
                    Mixer IP Address
                  </Label>
                  <Input
                    id="autoConnectIP"
                    type="text"
                    value={autoConnectIP}
                    onChange={(e) => setAutoConnectIP(e.target.value)}
                    placeholder="192.168.1.10"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500"
                  />
                  <p className="text-xs text-slate-400">
                    IP address of the X-Air mixer to connect to automatically
                  </p>
                </div>
              )}
            </div>

            {/* Password Protection Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Shield size={16} />
                    Password Protection
                  </Label>
                  <p className="text-xs text-slate-400">
                    Lock VU Meters & Clock dashboard in fullscreen mode
                  </p>
                </div>
                <Switch
                  checked={passwordProtectionEnabled}
                  onCheckedChange={handlePasswordProtectionToggle}
                />
              </div>

              {passwordProtectionEnabled && (
                <div className="space-y-4 pl-6 border-l-2 border-slate-600">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm text-slate-200">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm text-slate-200">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-700/50 p-3 rounded border border-slate-600">
                    <p className="font-medium mb-1 text-slate-300">Protected Features:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>VU Meters & Clock dashboard</li>
                      <li>Fullscreen mode exit</li>
                      <li>Tab switching when locked</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="border-slate-600 bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveSettings} 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Save size={16} />
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Unlock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PasswordUnlockModalProps {
  isOpen: boolean;
  onUnlock: (password: string) => boolean;
  onClose?: () => void;
  allowClose?: boolean;
}

export const PasswordUnlockModal: React.FC<PasswordUnlockModalProps> = ({
  isOpen,
  onUnlock,
  onClose,
  allowClose = true
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setAttempts(0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the password to unlock.",
        variant: "destructive",
      });
      return;
    }

    const success = onUnlock(password);
    
    if (success) {
      setPassword('');
      setAttempts(0);
      toast({
        title: "Unlocked",
        description: "Interface unlocked successfully.",
      });
    } else {
      setAttempts(prev => prev + 1);
      setPassword('');
      toast({
        title: "Incorrect Password",
        description: `Invalid password. Attempt ${attempts + 1}/5.`,
        variant: "destructive",
      });

      // Show warning after 3 attempts
      if (attempts >= 2) {
        toast({
          title: "Security Warning",
          description: "Multiple failed attempts detected.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowClose && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, allowClose]);

  return (
    <Dialog open={isOpen} onOpenChange={allowClose ? onClose : () => {}}>
      <DialogContent 
        className="sm:max-w-md bg-slate-800 border-slate-600 text-white" 
        onEscapeKeyDown={(e) => !allowClose && e.preventDefault()}
        onPointerDownOutside={(e) => !allowClose && e.preventDefault()}
        onInteractOutside={(e) => !allowClose && e.preventDefault()}
      >
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2 text-center justify-center text-white">
            <Shield size={20} className="text-yellow-500" />
            Interface Locked
          </DialogTitle>
          {/* Removed custom close button to avoid duplicate; using built-in one from DialogContent */}
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center text-sm text-slate-300">
            <p>This interface is password protected.</p>
            <p>Enter the password to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password" className="text-sm text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="unlock-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500"
                  autoFocus
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

            {attempts > 0 && (
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30">
                Failed attempts: {attempts}/5
              </div>
            )}

            <Button type="submit" className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Unlock size={16} />
              Unlock Interface
            </Button>
          </form>

          <div className="text-xs text-slate-400 text-center bg-slate-700/50 p-3 rounded border border-slate-600">
            <p className="font-medium mb-1 text-slate-300">Security Notice:</p>
            <p>
              The VU Meters & Clock dashboard is protected to prevent accidental 
              changes during live broadcasts.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

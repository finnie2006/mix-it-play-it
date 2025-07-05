import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Radio, Volume2, Activity, Settings } from 'lucide-react';

export const HelpModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle size={16} />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="text-green-400" size={24} />
            X-Air Radio Mode - Help & Information
          </DialogTitle>
          <DialogDescription>
            Professional X-Air mixer control for radio broadcasting
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Connect your X-Air 16 or X-Air 18 mixer to your network</li>
              <li>Enter your mixer's IP address in the connection panel</li>
              <li>Click "Connect to Mixer" to establish connection</li>
              <li>Configure your fader mappings in the Configuration tab</li>
              <li>Start using the mixer controls and VU meters</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Volume2 size={18} />
              Mixer Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Control your mixer channels with real-time fader and mute controls. 
              Supports both X-Air 16 (16 channels) and X-Air 18 (18 channels) models.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Activity size={18} />
              VU Meters & Clock
            </h3>
            <p className="text-sm text-muted-foreground">
              Monitor audio levels in real-time with professional VU meters. 
              Includes integrated clock display for radio broadcast timing.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Settings size={18} />
              Configuration
            </h3>
            <p className="text-sm text-muted-foreground">
              Set up fader mappings for radio automation software integration. 
              Configure which mixer channels correspond to your automation players.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Technical Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>OSC Port:</strong> 10024 (mixer communication)</p>
              <p><strong>WebSocket Port:</strong> 8080 (API server)</p>
              <p><strong>Local OSC Port:</strong> 10023 (bridge)</p>
              <p><strong>Version:</strong> 1.0.0</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

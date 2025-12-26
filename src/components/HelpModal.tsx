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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Radio className="text-green-400" size={24} />
            X-Air Radio Control - Help & Information
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Professional X-Air mixer control for radio broadcasting
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
              <li>Connect your X-Air 16 or X-Air 18 mixer to your network</li>
              <li>Enter your mixer's IP address in the connection panel</li>
              <li>Click "Connect to Mixer" to establish connection</li>
              <li>Configure your fader mappings in the Configuration tab</li>
              <li>Start using the mixer controls and VU meters</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              <Volume2 size={18} />
              Mixer Dashboard
            </h3>
            <p className="text-sm text-slate-300">
              Control your mixer channels with real-time fader and mute controls. 
              Supports both X-Air 16 (16 channels) and X-Air 18 (18 channels) models.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              <Activity size={18} />
              VU Meters & Clock
            </h3>
            <p className="text-sm text-slate-300">
              Monitor audio levels in real-time with professional VU meters. 
              Includes integrated clock display for radio broadcast timing.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              <Settings size={18} />
              Configuration
            </h3>
            <p className="text-sm text-slate-300">
              Set up fader mappings for radio automation software integration. 
              Configure which mixer channels correspond to your automation players.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">Technical Information</h3>
            <div className="text-sm space-y-1 text-slate-300">
              <p><strong>OSC Port:</strong> 10024 (mixer communication)</p>
              <p><strong>WebSocket Port:</strong> 8080 (API server)</p>
              <p><strong>Local OSC Port:</strong> 10023 (bridge)</p>
              <p><strong>Version:</strong> 1.0.0</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-600">
            <p className="text-xs text-slate-400 text-center">
              © {new Date().getFullYear()} X-Air Radio Control. All rights reserved.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

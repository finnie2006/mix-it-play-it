
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Wifi, AlertCircle, CheckCircle } from 'lucide-react';

export const RadioSoftwareStatus: React.FC = () => {
  const [connections] = useState([
    { name: 'mAirList', status: 'connected', port: 9300, lastPing: new Date() },
    { name: 'RadioDJ', status: 'disconnected', port: 18123, lastPing: null }
  ]);

  return (
    <Card className="p-6 bg-slate-800/50 border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Radio className="text-blue-400" size={24} />
        <h3 className="text-xl font-semibold text-white">Radio Software Status</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => (
          <div key={conn.name} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                conn.status === 'connected' 
                  ? 'bg-green-600/20 text-green-400' 
                  : 'bg-red-600/20 text-red-400'
              }`}>
                {conn.status === 'connected' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <h4 className="font-semibold text-white">{conn.name}</h4>
                <p className="text-sm text-slate-400">Port: {conn.port}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={conn.status === 'connected' ? 'default' : 'destructive'}>
                {conn.status.toUpperCase()}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Test
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

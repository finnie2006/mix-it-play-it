
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Wifi, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RadioSoftwareStatusProps {
  testConnection?: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number) => Promise<boolean>;
}

export const RadioSoftwareStatus: React.FC<RadioSoftwareStatusProps> = ({ 
  testConnection 
}) => {
  const [connections, setConnections] = useState([
    { name: 'mAirList', status: 'unknown', port: 9300, lastPing: null, testing: false },
    { name: 'RadioDJ', status: 'unknown', port: 18123, lastPing: null, testing: false }
  ]);
  const { toast } = useToast();

  const handleTest = async (software: 'mAirList' | 'RadioDJ', index: number) => {
    if (!testConnection) return;

    // Update testing state
    setConnections(prev => prev.map((conn, i) => 
      i === index ? { ...conn, testing: true } : conn
    ));

    try {
      const isConnected = await testConnection(software);
      
      setConnections(prev => prev.map((conn, i) => 
        i === index ? { 
          ...conn, 
          status: isConnected ? 'connected' : 'disconnected',
          lastPing: isConnected ? new Date() : null,
          testing: false
        } : conn
      ));

      toast({
        title: `${software} Test Complete`,
        description: isConnected ? 'Connection successful!' : 'Connection failed - check if software is running',
        variant: isConnected ? 'default' : 'destructive'
      });
    } catch (error) {
      setConnections(prev => prev.map((conn, i) => 
        i === index ? { ...conn, status: 'disconnected', testing: false } : conn
      ));
      
      toast({
        title: `${software} Test Failed`,
        description: 'Could not test connection',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="p-6 bg-slate-800/50 border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Radio className="text-blue-400" size={24} />
        <h3 className="text-xl font-semibold text-white">Radio Software Status</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn, index) => (
          <div key={conn.name} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                conn.status === 'connected' 
                  ? 'bg-green-600/20 text-green-400' 
                  : conn.status === 'disconnected'
                  ? 'bg-red-600/20 text-red-400'
                  : 'bg-yellow-600/20 text-yellow-400'
              }`}>
                {conn.status === 'connected' ? <CheckCircle size={20} /> : 
                 conn.status === 'disconnected' ? <AlertCircle size={20} /> :
                 <Wifi size={20} />}
              </div>
              <div>
                <h4 className="font-semibold text-white">{conn.name}</h4>
                <p className="text-sm text-slate-400">Port: {conn.port}</p>
                {conn.lastPing && (
                  <p className="text-xs text-slate-500">
                    Last: {conn.lastPing.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={
                conn.status === 'connected' ? 'default' : 
                conn.status === 'disconnected' ? 'destructive' : 'secondary'
              }>
                {conn.status.toUpperCase()}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => handleTest(conn.name as 'mAirList' | 'RadioDJ', index)}
                disabled={conn.testing}
              >
                {conn.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

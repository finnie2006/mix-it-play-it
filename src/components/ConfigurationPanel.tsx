
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FaderConfiguration } from '@/components/FaderConfiguration';
import { RadioSoftwareConfig } from '@/components/RadioSoftwareConfig';
import { Settings, Sliders, Radio } from 'lucide-react';

export const ConfigurationPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Configuration</h2>
        </div>

        <Tabs defaultValue="faders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
            <TabsTrigger value="faders" className="flex items-center gap-2">
              <Sliders size={16} />
              Fader Mapping
            </TabsTrigger>
            <TabsTrigger value="software" className="flex items-center gap-2">
              <Radio size={16} />
              Radio Software
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faders" className="mt-6">
            <FaderConfiguration />
          </TabsContent>

          <TabsContent value="software" className="mt-6">
            <RadioSoftwareConfig />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

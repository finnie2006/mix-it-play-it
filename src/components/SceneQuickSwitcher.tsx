import React, { useState, useEffect } from 'react';
import { sceneService, Scene } from '@/services/sceneService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SceneQuickSwitcherProps {
  isConnected?: boolean;
}

export const SceneQuickSwitcher: React.FC<SceneQuickSwitcherProps> = ({ isConnected = false }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to scene updates
    const unsubscribeScenes = sceneService.onScenesUpdate((updatedScenes) => {
      // Filter to only show scenes that have names (non-empty scenes)
      const namedScenes = updatedScenes.filter(s => s.name && s.name.trim() !== '');
      setScenes(namedScenes);
    });

    // Subscribe to current scene changes
    const unsubscribeCurrentScene = sceneService.onCurrentSceneChange((sceneId) => {
      setCurrentSceneId(sceneId);
    });

    return () => {
      unsubscribeScenes();
      unsubscribeCurrentScene();
    };
  }, [isConnected]);

  const handleSceneChange = async (sceneIdStr: string) => {
    const sceneId = parseInt(sceneIdStr);
    const scene = scenes.find(s => s.id === sceneId);
    
    if (sceneId === currentSceneId) return; // Already loaded

    setIsLoading(true);
    try {
      await sceneService.loadScene(sceneId);
      toast({
        title: "Scene Loaded",
        description: `Switched to: ${scene?.name || `Scene ${sceneId + 1}`}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load scene",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || scenes.length === 0) {
    return null; // Don't show if not connected or no scenes available
  }

  return (
    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
      <Film className="text-blue-400" size={16} />
      <span className="text-sm text-slate-300">Scene:</span>
      <Select
        value={currentSceneId?.toString() || ''}
        onValueChange={handleSceneChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] bg-slate-700 border-slate-600 text-white h-8">
          <SelectValue placeholder="Select scene..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {scenes.map((scene) => (
            <SelectItem
              key={scene.id}
              value={scene.id.toString()}
              className="text-white hover:bg-slate-700 focus:bg-slate-700"
            >
              <div className="flex items-center justify-between w-full">
                <span>{scene.name}</span>
                <span className="text-xs text-slate-400 ml-2">#{scene.id + 1}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

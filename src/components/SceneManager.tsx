import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sceneService, Scene } from '@/services/sceneService';
import { Play, Save, RefreshCw, Trash2, Film, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SceneManagerProps {
  isConnected?: boolean;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ isConnected = false }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveSceneId, setSaveSceneId] = useState<number>(0);
  const [saveSceneName, setSaveSceneName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to scene updates
    const unsubscribeScenes = sceneService.onScenesUpdate((updatedScenes) => {
      setScenes(updatedScenes);
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

  const handleLoadScene = async (sceneId: number, sceneName: string) => {
    setIsLoading(true);
    try {
      await sceneService.loadScene(sceneId);
      toast({
        title: "Scene Loaded",
        description: `Successfully loaded scene: ${sceneName || `Scene ${sceneId + 1}`}`,
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

  const handleSaveScene = async () => {
    setIsLoading(true);
    try {
      await sceneService.saveScene(saveSceneId, saveSceneName);
      toast({
        title: "Scene Saved",
        description: `Successfully saved to scene ${saveSceneId + 1}${saveSceneName ? `: ${saveSceneName}` : ''}`,
      });
      setIsSaveDialogOpen(false);
      setSaveSceneName('');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save scene",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openSaveDialog = (sceneId: number) => {
    setSaveSceneId(sceneId);
    const existingScene = scenes.find(s => s.id === sceneId);
    setSaveSceneName(existingScene?.name || '');
    setIsSaveDialogOpen(true);
  };

  // Group scenes by banks of 16 for better organization
  const sceneGroups = [];
  for (let i = 0; i < 64; i += 16) {
    sceneGroups.push({
      name: `Scenes ${i + 1}-${i + 16}`,
      scenes: Array.from({ length: 16 }, (_, idx) => {
        const sceneId = i + idx;
        const scene = scenes.find(s => s.id === sceneId);
        return scene || { id: sceneId, name: '', timestamp: 0 };
      })
    });
  }

  if (!isConnected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Film className="text-blue-400" size={20} />
            Scene Manager
          </CardTitle>
          <CardDescription className="text-slate-300">
            Connect to mixer to manage scenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            Mixer connection required to load and save scenes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Film className="text-blue-400" size={20} />
          Scene Manager
        </CardTitle>
        <CardDescription className="text-slate-300">
          Save and load mixer configurations for different show formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-sm text-slate-300">
              Current Scene: {currentSceneId !== null ? 
                (scenes.find(s => s.id === currentSceneId)?.name || `Scene ${currentSceneId + 1}`) : 
                'None'}
            </span>
          </div>
          <Button
            onClick={() => sceneService['requestSceneList']?.()}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>

        {sceneGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400">{group.name}</h3>
            <div className="grid grid-cols-4 gap-3">
              {group.scenes.map((scene) => {
                const isCurrentScene = currentSceneId === scene.id;
                const hasName = scene.name && scene.name.trim() !== '';

                return (
                  <div
                    key={scene.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isCurrentScene
                        ? 'bg-green-900/20 border-green-500/50'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400">
                        #{scene.id + 1}
                      </span>
                      {isCurrentScene && (
                        <CheckCircle className="text-green-400" size={12} />
                      )}
                    </div>
                    
                    <p className={`text-sm mb-3 truncate ${
                      hasName ? 'text-white font-medium' : 'text-slate-500 italic'
                    }`}>
                      {hasName ? scene.name : 'Empty'}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleLoadScene(scene.id, scene.name)}
                        disabled={isLoading || isCurrentScene}
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-8"
                      >
                        <Play size={12} className="mr-1" />
                        Load
                      </Button>
                      <Button
                        onClick={() => openSaveDialog(scene.id)}
                        disabled={isLoading}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 h-8"
                      >
                        <Save size={12} className="mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Save Dialog */}
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Save Current Mixer State</DialogTitle>
              <DialogDescription className="text-slate-300">
                Save the current mixer configuration to scene {saveSceneId + 1}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="scene-name" className="text-slate-200">
                  Scene Name (Optional)
                </Label>
                <Input
                  id="scene-name"
                  value={saveSceneName}
                  onChange={(e) => setSaveSceneName(e.target.value)}
                  placeholder="e.g., Morning Show, News Hour, Music Automation"
                  className="bg-slate-700 border-slate-600 text-white"
                  maxLength={32}
                />
                <p className="text-xs text-slate-400">
                  Give this scene a descriptive name to easily identify it later
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsSaveDialogOpen(false)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveScene}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                <Save size={16} className="mr-2" />
                {isLoading ? 'Saving...' : 'Save Scene'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export interface Scene {
  id: number; // Scene slot number (0-63 for X-Air)
  name: string;
  description?: string;
  timestamp?: number;
  isCustom?: boolean; // Whether it's a user-saved scene
}

export interface SceneMetadata {
  scenes: Scene[];
  currentScene?: number;
  lastUpdated: string;
}

export class SceneService {
  private bridgeConnection: WebSocket | null = null;
  private sceneListeners: Set<(scenes: Scene[]) => void> = new Set();
  private currentSceneListeners: Set<(sceneId: number) => void> = new Set();
  private scenes: Scene[] = [];
  private currentSceneId: number | null = null;

  constructor(private bridgeHost: string = 'localhost', private bridgePort: number = 8080) {
    this.connectToBridge();
  }

  private connectToBridge() {
    const wsUrl = `ws://${this.bridgeHost}:${this.bridgePort}`;
    console.log('🎬 Scene Service connecting to bridge:', wsUrl);

    this.bridgeConnection = new WebSocket(wsUrl);

    this.bridgeConnection.onopen = () => {
      console.log('🎬 Scene Service connected to bridge');
      // Request current scene list
      this.requestSceneList();
    };

    this.bridgeConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'scene_list') {
          this.scenes = message.scenes || [];
          this.notifySceneListeners();
        } else if (message.type === 'current_scene') {
          this.currentSceneId = message.sceneId;
          this.notifyCurrentSceneListeners(message.sceneId);
        } else if (message.type === 'scene_loaded') {
          console.log(`🎬 Scene ${message.sceneId} loaded successfully`);
          this.currentSceneId = message.sceneId;
          this.notifyCurrentSceneListeners(message.sceneId);
        } else if (message.type === 'scene_saved') {
          console.log(`🎬 Scene ${message.sceneId} saved successfully`);
          // Refresh scene list to get updated metadata
          this.requestSceneList();
        }
      } catch (error) {
        console.error('🎬 Error parsing scene service message:', error);
      }
    };

    this.bridgeConnection.onclose = () => {
      console.log('🎬 Scene Service disconnected, reconnecting...');
      setTimeout(() => this.connectToBridge(), 3000);
    };

    this.bridgeConnection.onerror = (error) => {
      console.error('🎬 Scene Service connection error:', error);
    };
  }

  // Request the list of available scenes from the mixer
  private requestSceneList() {
    if (this.bridgeConnection?.readyState === WebSocket.OPEN) {
      this.bridgeConnection.send(JSON.stringify({
        type: 'get_scene_list'
      }));
    }
  }

  // Load a scene by ID
  public loadScene(sceneId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bridgeConnection || this.bridgeConnection.readyState !== WebSocket.OPEN) {
        reject(new Error('Bridge not connected'));
        return;
      }

      console.log(`🎬 Loading scene ${sceneId}`);
      this.bridgeConnection.send(JSON.stringify({
        type: 'load_scene',
        sceneId
      }));

      // Wait for confirmation
      const timeout = setTimeout(() => {
        reject(new Error('Scene load timeout'));
      }, 5000);

      const listener = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'scene_loaded' && message.sceneId === sceneId) {
            clearTimeout(timeout);
            this.bridgeConnection?.removeEventListener('message', listener);
            resolve();
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.bridgeConnection.addEventListener('message', listener);
    });
  }

  // Save current mixer state to a scene slot
  public saveScene(sceneId: number, name?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bridgeConnection || this.bridgeConnection.readyState !== WebSocket.OPEN) {
        reject(new Error('Bridge not connected'));
        return;
      }

      console.log(`🎬 Saving scene ${sceneId}${name ? ` as "${name}"` : ''}`);
      this.bridgeConnection.send(JSON.stringify({
        type: 'save_scene',
        sceneId,
        name
      }));

      // Wait for confirmation
      const timeout = setTimeout(() => {
        reject(new Error('Scene save timeout'));
      }, 5000);

      const listener = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'scene_saved' && message.sceneId === sceneId) {
            clearTimeout(timeout);
            this.bridgeConnection?.removeEventListener('message', listener);
            resolve();
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.bridgeConnection.addEventListener('message', listener);
    });
  }

  // Get the list of available scenes
  public getScenes(): Scene[] {
    return this.scenes;
  }

  // Get current scene ID
  public getCurrentSceneId(): number | null {
    return this.currentSceneId;
  }

  // Subscribe to scene list updates
  public onScenesUpdate(callback: (scenes: Scene[]) => void) {
    this.sceneListeners.add(callback);
    // Immediately call with current scenes
    callback(this.scenes);
    return () => this.sceneListeners.delete(callback);
  }

  // Subscribe to current scene changes
  public onCurrentSceneChange(callback: (sceneId: number) => void) {
    this.currentSceneListeners.add(callback);
    if (this.currentSceneId !== null) {
      callback(this.currentSceneId);
    }
    return () => this.currentSceneListeners.delete(callback);
  }

  private notifySceneListeners() {
    this.sceneListeners.forEach(callback => callback(this.scenes));
  }

  private notifyCurrentSceneListeners(sceneId: number) {
    this.currentSceneListeners.forEach(callback => callback(sceneId));
  }

  public disconnect() {
    if (this.bridgeConnection) {
      this.bridgeConnection.close();
      this.bridgeConnection = null;
    }
    this.sceneListeners.clear();
    this.currentSceneListeners.clear();
  }
}

// Singleton instance
export const sceneService = new SceneService();

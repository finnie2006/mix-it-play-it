/// <reference types="vite/client" />

interface ElectronFullscreenState {
  isFullScreen: boolean;
}

interface ElectronFullscreenAPI {
  setFullscreen: (enabled: boolean) => Promise<{ success?: boolean } | void>;
  getState: () => Promise<ElectronFullscreenState>;
  onRequestExit: (callback: () => void) => void;
  onFullscreenChanged: (
    callback: (event: unknown, isFullScreen: boolean) => void
  ) => void;
}

interface ElectronAPI {
  fullscreen: ElectronFullscreenAPI;
}

interface Window {
  electronAPI?: ElectronAPI;
}

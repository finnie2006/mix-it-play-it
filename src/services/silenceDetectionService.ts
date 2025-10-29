export interface SilenceDetectionConfig {
  enabled: boolean;
  threshold: number; // dB level below which is considered silence (e.g., -60)
  duration: number; // milliseconds of silence before triggering alarm
  monitorChannels: 'main' | 'bus' | 'channels'; // What to monitor
  busNumber?: number; // If monitoring bus, which one (1-6)
  channelNumbers?: number[]; // If monitoring specific channels
}

export interface SilenceAlarmState {
  isActive: boolean;
  silenceDuration: number; // How long silence has been detected (ms)
  lastAudioTime: number; // Last time audio was detected
  triggeredAt?: number; // When alarm was triggered
}

const DEFAULT_CONFIG: SilenceDetectionConfig = {
  enabled: false,
  threshold: -60,
  duration: 5000, // 5 seconds
  monitorChannels: 'main',
};

const STORAGE_KEY = 'silence-detection-config';

export class SilenceDetectionService {
  private config: SilenceDetectionConfig;
  private alarmState: SilenceAlarmState = {
    isActive: false,
    silenceDuration: 0,
    lastAudioTime: Date.now(),
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: SilenceAlarmState) => void> = new Set();
  private currentLevels: { main: number[]; buses: number[]; channels: number[] } = {
    main: [-90, -90],
    buses: Array(6).fill(-90),
    channels: Array(16).fill(-90),
  };

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): SilenceDetectionConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load silence detection config:', error);
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(config: SilenceDetectionConfig): void {
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    
    // Restart monitoring with new config
    this.stop();
    if (config.enabled) {
      this.start();
    }
  }

  public getConfig(): SilenceDetectionConfig {
    return { ...this.config };
  }

  public start(): void {
    if (this.checkInterval) return;

    console.log('🔇 Starting silence detection monitoring');
    
    // Check every 100ms
    this.checkInterval = setInterval(() => {
      this.checkSilence();
    }, 100);
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔇 Stopped silence detection monitoring');
    }
    
    // Clear alarm if active
    if (this.alarmState.isActive) {
      this.alarmState.isActive = false;
      this.notifyListeners();
    }
  }

  public updateLevels(data: { channels: number[]; buses?: number[] }): void {
    if (!this.config.enabled) return;

    // Update stored levels
    if (data.channels.length >= 38) {
      this.currentLevels.main = [data.channels[36] || -90, data.channels[37] || -90];
    }
    if (data.channels.length >= 16) {
      this.currentLevels.channels = data.channels.slice(0, 16);
    }
    if (data.buses) {
      this.currentLevels.buses = data.buses;
    }
  }

  private checkSilence(): void {
    if (!this.config.enabled) return;

    let currentLevel = -90;

    // Determine which levels to monitor
    switch (this.config.monitorChannels) {
      case 'main':
        // Use the louder of the two main channels
        currentLevel = Math.max(...this.currentLevels.main);
        break;
      
      case 'bus':
        if (this.config.busNumber && this.config.busNumber >= 1 && this.config.busNumber <= 6) {
          currentLevel = this.currentLevels.buses[this.config.busNumber - 1] || -90;
        }
        break;
      
      case 'channels':
        if (this.config.channelNumbers && this.config.channelNumbers.length > 0) {
          const levels = this.config.channelNumbers.map(ch => 
            this.currentLevels.channels[ch - 1] || -90
          );
          currentLevel = Math.max(...levels);
        }
        break;
    }

    // Check if audio is above threshold
    if (currentLevel > this.config.threshold) {
      // Audio detected
      this.alarmState.lastAudioTime = Date.now();
      this.alarmState.silenceDuration = 0;
      
      // Clear alarm if it was active
      if (this.alarmState.isActive) {
        this.alarmState.isActive = false;
        this.alarmState.triggeredAt = undefined;
        console.log('🔊 Audio detected, silence alarm cleared');
        this.notifyListeners();
      }
    } else {
      // Silence detected
      const silenceDuration = Date.now() - this.alarmState.lastAudioTime;
      this.alarmState.silenceDuration = silenceDuration;
      
      // Trigger alarm if silence exceeds duration threshold
      if (!this.alarmState.isActive && silenceDuration >= this.config.duration) {
        this.alarmState.isActive = true;
        this.alarmState.triggeredAt = Date.now();
        console.warn('🔇 SILENCE ALARM TRIGGERED! No audio for', silenceDuration, 'ms');
        this.notifyListeners();
      }
    }
  }

  public getAlarmState(): SilenceAlarmState {
    return { ...this.alarmState };
  }

  public onAlarmChange(callback: (state: SilenceAlarmState) => void): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.alarmState);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.alarmState));
  }

  public acknowledgeAlarm(): void {
    // Temporarily clear the alarm (will re-trigger if silence continues)
    if (this.alarmState.isActive) {
      this.alarmState.isActive = false;
      this.alarmState.triggeredAt = undefined;
      this.alarmState.lastAudioTime = Date.now(); // Reset the timer
      this.notifyListeners();
    }
  }
}

export const silenceDetectionService = new SilenceDetectionService();

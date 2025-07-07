export interface FaderMapping {
  id: string;
  channel: number;
  isStereo: boolean;
  threshold: number;
  command: string;
  enabled: boolean;
  description: string;
  fadeDownThreshold?: number;
  fadeDownCommand?: string;
  listenToMute?: boolean; // NEW: listen to mute/unmute events
}

export interface RadioSoftwareConfig {
  type: 'mairlist' | 'radiodj';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
}

export interface SpeakerMuteConfig {
  enabled: boolean;
  triggerChannels: number[];
  muteType: 'bus' | 'muteGroup';
  busNumber?: number;
  muteGroupNumber?: number;
  threshold: number;
  description: string;
}

export interface AppSettings {
  radioSoftware: RadioSoftwareConfig;
  faderMappings: FaderMapping[];
  speakerMute: SpeakerMuteConfig;
  lastUpdated: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  radioSoftware: {
    type: 'mairlist',
    host: 'localhost',
    port: 9300,
    enabled: false
  },
  faderMappings: [],
  speakerMute: {
    enabled: false,
    triggerChannels: [],
    muteType: 'bus',
    busNumber: 1,
    muteGroupNumber: 1,
    threshold: 10,
    description: 'Mute main speakers when mics are open'
  },
  lastUpdated: new Date().toISOString()
};

const SETTINGS_KEY = 'xair-controller-settings';

export class SettingsService {
  static loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    try {
      settings.lastUpdated = new Date().toISOString();
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings, null, 2));
      console.log('⚙️ Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static updateRadioSoftware(config: RadioSoftwareConfig): void {
    const settings = this.loadSettings();
    settings.radioSoftware = config;
    this.saveSettings(settings);
  }

  static updateFaderMappings(mappings: FaderMapping[]): void {
    const settings = this.loadSettings();
    settings.faderMappings = mappings;
    this.saveSettings(settings);
  }

  static addFaderMapping(mapping: Omit<FaderMapping, 'id'>): void {
    const settings = this.loadSettings();
    const newMapping: FaderMapping = {
      ...mapping,
      id: `fader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    settings.faderMappings.push(newMapping);
    this.saveSettings(settings);
  }

  static removeFaderMapping(id: string): void {
    const settings = this.loadSettings();
    settings.faderMappings = settings.faderMappings.filter(m => m.id !== id);
    this.saveSettings(settings);
  }

  static updateFaderMapping(id: string, updates: Partial<FaderMapping>): void {
    const settings = this.loadSettings();
    const index = settings.faderMappings.findIndex(m => m.id === id);
    if (index !== -1) {
      settings.faderMappings[index] = { ...settings.faderMappings[index], ...updates };
      this.saveSettings(settings);
    }
  }

  static updateSpeakerMute(config: SpeakerMuteConfig): void {
    const settings = this.loadSettings();
    settings.speakerMute = config;
    this.saveSettings(settings);
  }
}

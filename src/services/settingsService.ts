export interface FaderMapping {
  id: string;
  channel: number;
  followChannelName?: boolean; // NEW: if true, follow channel name instead of position
  channelName?: string; // NEW: cached channel name (auto-fetched when followChannelName is true)
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
  followChannelNames?: boolean; // NEW: if true, follow channel names instead of positions
  triggerChannelNames?: string[]; // NEW: channel names to follow (when followChannelNames is true)
  muteType: 'bus' | 'muteGroup' | 'none';
  busNumber?: number;
  muteGroupNumber?: number;
  threshold: number;
  description: string;
}

export interface ChannelNameMap {
  [channelNumber: number]: string;
}

export interface BusMeterConfig {
  enabled: boolean;
  busNumber: number; // 1-6 for the 6 available buses
  label: string; // Custom label (e.g., "CRM")
  isStereo: boolean; // If true, show L/R for the bus
}

export interface MainLRConfig {
  label: string; // Custom label (e.g., "PGM")
}

export interface AppSettings {
  radioSoftware: RadioSoftwareConfig;
  faderMappings: FaderMapping[];
  speakerMute: SpeakerMuteConfig;
  channelNames: ChannelNameMap; // NEW: store channel names from mixer
  busMeter?: BusMeterConfig; // Bus meter configuration
  mainLR?: MainLRConfig; // Main LR label configuration
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
    followChannelNames: false,
    triggerChannelNames: [],
    muteType: 'bus',
    busNumber: 1,
    muteGroupNumber: 1,
    threshold: 10,
    description: 'Mute main speakers when mics are open'
  },
  channelNames: {}, // NEW: empty channel names by default
  busMeter: {
    enabled: false,
    busNumber: 1,
    label: 'CRM',
    isStereo: true
  },
  mainLR: {
    label: 'PGM'
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

  static updateBusMeter(config: BusMeterConfig): void {
    const settings = this.loadSettings();
    settings.busMeter = config;
    this.saveSettings(settings);
  }

  static updateMainLR(config: MainLRConfig): void {
    const settings = this.loadSettings();
    settings.mainLR = config;
    this.saveSettings(settings);
  }

  static updateChannelNames(channelNames: ChannelNameMap): void {
    const settings = this.loadSettings();
    settings.channelNames = channelNames;
    this.saveSettings(settings);
  }

  static getChannelName(channel: number): string | undefined {
    const settings = this.loadSettings();
    return settings.channelNames[channel];
  }

  static getAllChannelNames(): ChannelNameMap {
    const settings = this.loadSettings();
    return settings.channelNames;
  }
}

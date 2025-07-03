
import settingsData from '@/config/settings.json';

export interface FaderMappingConfig {
  id: string;
  channel: number;
  enabled: boolean;
  threshold: number;
  action: string;
  radioSoftware: string;
  command: string;
  description: string;
  muteEnabled?: boolean;
  muteAction?: string;
  muteRadioSoftware?: string;
  muteCommand?: string;
}

export interface RadioSoftwareConfig {
  mairlist: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    apiEndpoint: string;
  };
}

export interface AppSettings {
  faderMappings: FaderMappingConfig[];
  radioSoftware: RadioSoftwareConfig;
}

const SETTINGS_STORAGE_KEY = 'xair-app-settings';

export class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private loadSettings(): AppSettings {
    // Try to load from localStorage first (for existing users)
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        console.log('📁 Loaded settings from localStorage:', parsed);
        return parsed;
      } catch (error) {
        console.error('Failed to parse saved settings, using defaults:', error);
      }
    }

    // Fallback to default settings from JSON file
    console.log('📁 Loading default settings from config file');
    return settingsData as AppSettings;
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public getFaderMappings(): FaderMappingConfig[] {
    return this.settings.faderMappings;
  }

  public getRadioSoftwareConfig(): RadioSoftwareConfig {
    return this.settings.radioSoftware;
  }

  public updateFaderMappings(mappings: FaderMappingConfig[]): void {
    this.settings.faderMappings = mappings;
    this.saveSettings();
    console.log('💾 Fader mappings updated:', mappings);
  }

  public updateRadioSoftwareConfig(config: RadioSoftwareConfig): void {
    this.settings.radioSoftware = config;
    this.saveSettings();
    console.log('💾 Radio software config updated:', config);
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      console.log('💾 Settings saved to localStorage');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  public importSettings(settingsJson: string): boolean {
    try {
      const parsed = JSON.parse(settingsJson);
      this.settings = parsed;
      this.saveSettings();
      console.log('📥 Settings imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}

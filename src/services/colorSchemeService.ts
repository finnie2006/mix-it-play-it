export interface ColorScheme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryHover: string;
    accent: string;
    accentHover: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    name: 'Default Dark',
    description: 'Professional dark theme with green accents',
    colors: {
      background: '#0f172a',
      backgroundSecondary: '#1e293b',
      backgroundTertiary: '#334155',
      text: '#ffffff',
      textSecondary: '#cbd5e1',
      primary: '#10b981',
      primaryHover: '#059669',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#475569',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    description: 'Cool blue theme for a modern look',
    colors: {
      background: '#0c1836',
      backgroundSecondary: '#1e3a5f',
      backgroundTertiary: '#2d4a6f',
      text: '#ffffff',
      textSecondary: '#a5b4c5',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      border: '#3d5a7f',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Sophisticated purple theme',
    colors: {
      background: '#1a0f2e',
      backgroundSecondary: '#2d1b4e',
      backgroundTertiary: '#3d2a5e',
      text: '#ffffff',
      textSecondary: '#c4b5d5',
      primary: '#a855f7',
      primaryHover: '#9333ea',
      accent: '#ec4899',
      accentHover: '#db2777',
      border: '#5d4a7f',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'red',
    name: 'Broadcast Red',
    description: 'Bold red theme for live broadcasting',
    colors: {
      background: '#1a0a0a',
      backgroundSecondary: '#2d1515',
      backgroundTertiary: '#3d2020',
      text: '#ffffff',
      textSecondary: '#d5b5b5',
      primary: '#ef4444',
      primaryHover: '#dc2626',
      accent: '#f97316',
      accentHover: '#ea580c',
      border: '#5f3535',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    description: 'Warm, inviting amber theme',
    colors: {
      background: '#1a1410',
      backgroundSecondary: '#2d2315',
      backgroundTertiary: '#3d3220',
      text: '#ffffff',
      textSecondary: '#d5c5b5',
      primary: '#f59e0b',
      primaryHover: '#d97706',
      accent: '#fb923c',
      accentHover: '#f97316',
      border: '#5f4a35',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'teal',
    name: 'Studio Teal',
    description: 'Professional teal for audio production',
    colors: {
      background: '#0a1a1a',
      backgroundSecondary: '#15292d',
      backgroundTertiary: '#20383d',
      text: '#ffffff',
      textSecondary: '#b5d5d5',
      primary: '#14b8a6',
      primaryHover: '#0d9488',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      border: '#355f5f',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  {
    id: 'light',
    name: 'Light Mode',
    description: 'Clean light theme for bright environments',
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f8fafc',
      backgroundTertiary: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#475569',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      accent: '#10b981',
      accentHover: '#059669',
      border: '#cbd5e1',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
];

const STORAGE_KEY = 'color-scheme';

export class ColorSchemeService {
  private currentScheme: ColorScheme;

  constructor() {
    this.currentScheme = this.loadScheme();
    this.applyScheme(this.currentScheme);
  }

  private loadScheme(): ColorScheme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const scheme = COLOR_SCHEMES.find(s => s.id === stored);
        if (scheme) return scheme;
      }
    } catch (error) {
      console.error('Failed to load color scheme:', error);
    }
    return COLOR_SCHEMES[0]; // Default
  }

  public setScheme(schemeId: string): void {
    const scheme = COLOR_SCHEMES.find(s => s.id === schemeId);
    if (!scheme) return;

    this.currentScheme = scheme;
    localStorage.setItem(STORAGE_KEY, schemeId);
    this.applyScheme(scheme);
  }

  public getCurrentScheme(): ColorScheme {
    return this.currentScheme;
  }

  public getAllSchemes(): ColorScheme[] {
    return COLOR_SCHEMES;
  }

  private applyScheme(scheme: ColorScheme): void {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--color-bg', scheme.colors.background);
    root.style.setProperty('--color-bg-secondary', scheme.colors.backgroundSecondary);
    root.style.setProperty('--color-bg-tertiary', scheme.colors.backgroundTertiary);
    root.style.setProperty('--color-text', scheme.colors.text);
    root.style.setProperty('--color-text-secondary', scheme.colors.textSecondary);
    root.style.setProperty('--color-primary', scheme.colors.primary);
    root.style.setProperty('--color-primary-hover', scheme.colors.primaryHover);
    root.style.setProperty('--color-accent', scheme.colors.accent);
    root.style.setProperty('--color-accent-hover', scheme.colors.accentHover);
    root.style.setProperty('--color-border', scheme.colors.border);
    root.style.setProperty('--color-success', scheme.colors.success);
    root.style.setProperty('--color-warning', scheme.colors.warning);
    root.style.setProperty('--color-danger', scheme.colors.danger);
    
    // Apply main background gradient to body
    const body = document.body;
    if (scheme.id === 'light') {
      body.style.background = `linear-gradient(to bottom right, #e2e8f0, #cbd5e1, #94a3b8)`;
    } else {
      // For dark themes, use the background colors in a gradient
      body.style.background = `linear-gradient(to bottom right, ${scheme.colors.background}, ${scheme.colors.backgroundSecondary}, ${scheme.colors.background})`;
    }
    
    // Apply data attribute for easier CSS targeting
    root.setAttribute('data-color-scheme', scheme.id);

    console.log('🎨 Applied color scheme:', scheme.name);
  }
}

export const colorSchemeService = new ColorSchemeService();

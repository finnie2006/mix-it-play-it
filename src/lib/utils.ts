import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Time formatting utilities
export interface TimeSettings {
  use24Hour: boolean;
}

export function getTimeSettings(): TimeSettings {
  const saved = localStorage.getItem('timeSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fall back to default
    }
  }
  return { use24Hour: true }; // Default to 24-hour format
}

export function saveTimeSettings(settings: TimeSettings): void {
  localStorage.setItem('timeSettings', JSON.stringify(settings));
}

export function formatTime(date: Date, use24Hour: boolean = true): string {
  if (use24Hour) {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  } else {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  }
}

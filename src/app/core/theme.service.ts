import { inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly currentTheme = signal<AppTheme>('dark');

  constructor() {
    this.initTheme();
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private initTheme(): void {
    const storage = this.getStorage();
    const saved = storage?.getItem('app_theme') as AppTheme | null;
    if (saved && (saved === 'dark' || saved === 'light')) {
      this.setTheme(saved);
    } else {
      // Default: dark theme para la estética athletic/fitness
      this.setTheme('dark');
    }
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    this.getStorage()?.setItem('app_theme', theme);
    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }
}

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

  private initTheme(): void {
    const saved = localStorage.getItem('app_theme') as AppTheme | null;
    if (saved && (saved === 'dark' || saved === 'light')) {
      this.setTheme(saved);
    } else {
      // Default: dark theme para la estética athletic/fitness
      this.setTheme('dark');
    }
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }
}

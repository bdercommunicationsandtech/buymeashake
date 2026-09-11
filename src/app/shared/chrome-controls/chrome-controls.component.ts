import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../core/theme.service';
import { LanguageService } from '../../core/language.service';

export type ChromeControlsVariant = 'default' | 'onDark';

/**
 * Language + theme toggles used across public, auth, dashboard and supporter chrome.
 */
@Component({
  selector: 'app-chrome-controls',
  standalone: true,
  host: { class: 'inline-flex items-center gap-1.5 sm:gap-2 shrink-0' },
  template: `
    <button
      type="button"
      (click)="languageService.toggleLanguage()"
      [title]="lang() === 'es' ? 'Switch to English' : 'Cambiar a Español'"
      [attr.aria-label]="t().nav.switchLanguage"
      [class]="langBtnClass()"
    >
      @if (variant() === 'default') {
        <span class="text-emerald-600 dark:text-[#c9ff3d] text-sm leading-none" aria-hidden="true">🌐</span>
      } @else {
        <svg class="w-4 h-4 text-[#ccff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12h20"/>
        </svg>
      }
      <span class="text-[11px] font-black tracking-wider uppercase">
        {{ lang() === 'es' ? 'ES' : 'EN' }}
      </span>
    </button>

    <button
      type="button"
      (click)="themeService.toggleTheme()"
      [class]="themeBtnClass()"
      [title]="themeService.currentTheme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      [attr.aria-label]="t().common.toggleTheme"
    >
      @if (themeService.currentTheme() === 'dark') {
        <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      } @else {
        <svg
          class="w-4 h-4"
          [class]="variant() === 'onDark' ? 'text-white/85' : 'text-gray-600'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      }
    </button>
  `,
})
export class ChromeControlsComponent {
  readonly themeService = inject(ThemeService);
  readonly languageService = inject(LanguageService);

  /** `onDark` = glass controls for cinematic/auth dark surfaces. */
  readonly variant = input<ChromeControlsVariant>('default');
  readonly size = input<'sm' | 'md'>('md');

  readonly lang = this.languageService.lang;
  readonly t = this.languageService.t;

  langBtnClass(): string {
    const h = this.size() === 'sm' ? 'h-9' : 'h-10 min-h-[40px]';
    if (this.variant() === 'onDark') {
      return `${h} px-2.5 sm:px-3 rounded-xl border border-white/15 bg-white/5 text-gray-200 flex items-center gap-1.5 hover:bg-white/10 transition shadow-xs cursor-pointer select-none`;
    }
    return `${h} px-2.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-gray-700 dark:text-gray-200 transition cursor-pointer select-none border border-gray-200/80 dark:border-white/10`;
  }

  themeBtnClass(): string {
    const box = this.size() === 'sm' ? 'h-9 w-9' : 'h-10 w-10 min-h-[40px] min-w-[40px]';
    if (this.variant() === 'onDark') {
      return `${box} rounded-xl border border-white/15 bg-white/5 text-white/80 grid place-items-center hover:bg-white/10 transition cursor-pointer`;
    }
    return `${box} rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 grid place-items-center text-gray-600 dark:text-gray-300 transition cursor-pointer border border-gray-200/80 dark:border-white/10`;
  }
}

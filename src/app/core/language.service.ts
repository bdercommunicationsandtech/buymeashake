import { Injectable, signal, computed } from '@angular/core';
import { AppLanguage, TRANSLATIONS, TranslationSchema } from './i18n';

export const DEFAULT_LANGUAGE: AppLanguage = 'es';
export const LANGUAGE_STORAGE_KEY = 'buymeashake.language';
const LEGACY_STORAGE_KEY = 'buymeashake_lang';

export const DISCIPLINE_ES_TO_EN: Record<string, string> = {
  'Fuerza & Levantamiento': 'Strength & Lifting',
  'CrossFit & Funcional': 'CrossFit & Functional',
  'Running & Atletismo': 'Running & Athletics',
  'Ciclismo & Ruta': 'Cycling & Road',
  'Artes Marciales & Boxeo': 'Martial Arts & Boxing',
  'Deportes Acuáticos & Natación': 'Water Sports & Swimming',
  'Fútbol & Colectivos': 'Soccer & Team Sports',
  'Movilidad & Yoga': 'Mobility & Yoga',
  'Calistenia & Freestyle': 'Calisthenics & Freestyle',
  'Powerlifting': 'Powerlifting',
  'Ultra Running': 'Ultra Running',
  'Ultra Trail Running': 'Ultra Trail Running',
  'CrossFit Games': 'CrossFit Games',
  'CrossFit': 'CrossFit',
  'Artes Marciales / BJJ': 'Martial Arts / BJJ',
  'Natación & Triatlón': 'Swimming & Triathlon',
  'Deporte General': 'General Sports',
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly activeLang = signal<AppLanguage>(this.resolveInitialLanguage());

  // Public Signals
  readonly lang = this.activeLang.asReadonly();
  readonly t = computed<TranslationSchema>(() => TRANSLATIONS[this.activeLang()]);

  constructor() {
    this.syncDocumentLang(this.activeLang());
  }

  toggleLanguage(): void {
    const nextLang: AppLanguage = this.activeLang() === 'es' ? 'en' : 'es';
    this.setLanguage(nextLang);
  }

  setLanguage(newLang: AppLanguage): void {
    if (this.activeLang() === newLang) {
      this.persistLanguage(newLang);
      return;
    }
    this.activeLang.set(newLang);
    this.persistLanguage(newLang);
    this.syncDocumentLang(newLang);
  }

  private resolveInitialLanguage(): AppLanguage {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored === 'es' || stored === 'en') {
        return stored;
      }
    } catch {
      // Ignorar errores en caso de acceso restringido a localStorage
    }

    const browserLang = (typeof window !== 'undefined' && window.navigator?.language ? window.navigator.language : '').toLowerCase();
    return browserLang.startsWith('en') ? 'en' : 'es';
  }

  private persistLanguage(language: AppLanguage): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignorar errores en caso de almacenamiento no disponible
    }
  }

  private syncDocumentLang(language: AppLanguage): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language;
    }
  }

  translateDiscipline(name: string): string {
    if (!name) return '';
    if (this.activeLang() === 'es') {
      for (const [es, en] of Object.entries(DISCIPLINE_ES_TO_EN)) {
        if (en.toLowerCase() === name.toLowerCase()) return es;
      }
      return name;
    }
    return DISCIPLINE_ES_TO_EN[name] || name;
  }
}

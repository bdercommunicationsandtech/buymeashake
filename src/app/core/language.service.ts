import { Injectable, signal, computed } from '@angular/core';
import { AppLanguage, TRANSLATIONS, TranslationSchema } from './i18n';
import { getStorageItem, setStorageItem } from './utils/storage.util';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';
export const LANGUAGE_STORAGE_KEY = 'buymeashake.language';
const LEGACY_STORAGE_KEY = 'buymeashake_lang';

export const DISCIPLINE_ES_TO_EN: Record<string, string> = {
  'Fútbol': 'Soccer',
  'Baloncesto': 'Basketball',
  'Tenis': 'Tennis',
  'Pádel': 'Padel',
  'Voleibol': 'Volleyball',
  'Atletismo': 'Athletics',
  'Natación': 'Swimming',
  'Ciclismo': 'Cycling',
  'Gimnasia': 'Gymnastics',
  'Boxeo': 'Boxing',
  'MMA': 'MMA',
  'Jiu-Jitsu Brasileño': 'Brazilian Jiu-Jitsu',
  'Judo': 'Judo',
  'Karate': 'Karate',
  'Taekwondo': 'Taekwondo',
  'Halterofilia': 'Weightlifting',
  'Powerlifting': 'Powerlifting',
  'Fisicoculturismo': 'Bodybuilding',
  'CrossFit': 'CrossFit',
  'Triatlón': 'Triathlon',
  'Yoga': 'Yoga',
  'Calistenia': 'Calisthenics',
  'Surf': 'Surfing',
  'Skateboarding': 'Skateboarding',
  'Escalada': 'Climbing',
  'Rugby': 'Rugby',
  'Fútbol Americano': 'American Football',
  'Béisbol': 'Baseball',
  'Golf': 'Golf',
  'Automovilismo': 'Motorsports',
  'Esgrima': 'Fencing',
  'Remo': 'Rowing',
  'Esquí': 'Skiing',
  'Snowboard': 'Snowboarding',
  'Tenis de Mesa': 'Table Tennis',
  'Waterpolo': 'Water Polo',
  'Esports': 'Esports',
  'Fuerza & Levantamiento': 'Strength & Lifting',
  'CrossFit & Funcional': 'CrossFit & Functional',
  'Running & Atletismo': 'Running & Athletics',
  'Ciclismo & Ruta': 'Cycling & Road',
  'Artes Marciales & Boxeo': 'Martial Arts & Boxing',
  'Deportes Acuáticos & Natación': 'Water Sports & Swimming',
  'Fútbol & Colectivos': 'Soccer & Team Sports',
  'Movilidad & Yoga': 'Mobility & Yoga',
  'Calistenia & Freestyle': 'Calisthenics & Freestyle',
  'Ultra Running': 'Ultra Running',
  'Ultra Trail Running': 'Ultra Trail Running',
  'CrossFit Games': 'CrossFit Games',
  'Crossfit': 'CrossFit',
  'Artes Marciales / BJJ': 'Martial Arts / BJJ',
  'Natación & Triatlón': 'Swimming & Triathlon',
  'Deporte General': 'General Sports',
  'Fuerza': 'Strength',
  'Futbol': 'Soccer',
  'Triatlon': 'Triathlon',
  'Entrenador': 'Coach',
  'Entrenador Personal': 'Personal Trainer',
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly activeLang = signal<AppLanguage>(this.resolveInitialLanguage());

  // Public Signals
  readonly lang = this.activeLang.asReadonly();
  readonly currentLang = this.lang;
  readonly t = computed<TranslationSchema>(() => TRANSLATIONS[this.activeLang()]);
  readonly currentTranslations = this.t;

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

    const stored = getStorageItem(LANGUAGE_STORAGE_KEY) || getStorageItem(LEGACY_STORAGE_KEY);
    if (stored === 'es' || stored === 'en') {
      return stored;
    }

    const browserLang = (window.navigator?.language || '').toLowerCase();
    return browserLang.startsWith('es') ? 'es' : 'en';
  }

  private persistLanguage(language: AppLanguage): void {
    setStorageItem(LANGUAGE_STORAGE_KEY, language);
  }

  private syncDocumentLang(language: AppLanguage): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language;
    }
  }

  translateDiscipline(name: string): string {
    if (!name) return '';
    const trimmed = name.trim();
    if (this.activeLang() === 'es') {
      for (const [es, en] of Object.entries(DISCIPLINE_ES_TO_EN)) {
        if (en.toLowerCase() === trimmed.toLowerCase()) return es;
      }
      return trimmed;
    }
    for (const [es, en] of Object.entries(DISCIPLINE_ES_TO_EN)) {
      if (es.toLowerCase() === trimmed.toLowerCase()) return en;
    }
    return DISCIPLINE_ES_TO_EN[trimmed] || trimmed;
  }

  translateNotificationTitle(title: string): string {
    if (!title) return '';
    const trimmed = title.trim();
    const isEn = this.activeLang() === 'en';

    // 1. Shakes recibidos
    const shakeMatch = trimmed.match(/(?:¡?Recibiste\s+(\d+)\s+Shakes?!|(\d+)\s+Shakes?\s+received!|You\s+received\s+(\d+)\s+Shakes?!)/i);
    if (shakeMatch) {
      const count = parseInt(shakeMatch[1] || shakeMatch[2] || shakeMatch[3] || '1', 10);
      const shakeWord = count === 1 ? 'Shake' : 'Shakes';
      return isEn ? `You received ${count} ${shakeWord}!` : `¡Recibiste ${count} ${shakeWord}!`;
    }

    // 2. Nuevo miembro
    if (/Nuevo\s+Miembro\s+en\s+tu\s+Comunidad|New\s+Member\s+in\s+your\s+Community/i.test(trimmed)) {
      return isEn ? 'New Member in your Community! ⭐️' : '¡Nuevo Miembro en tu Comunidad! ⭐️';
    }

    // 3. Nuevo comentario
    if (/Nuevo\s+comentario\s+en\s+tu\s+publicaci[oó]n|New\s+comment\s+on\s+your\s+post/i.test(trimmed)) {
      return isEn ? 'New comment on your post' : 'Nuevo comentario en tu publicación';
    }

    // 4. Respuesta de atleta
    const replyMatch = trimmed.match(/@?([\w.-]+)\s+(?:te\s+ha\s+respondido|replied\s+to\s+you)/i);
    if (replyMatch) {
      const handle = replyMatch[1];
      return isEn ? `@${handle} replied to you` : `@${handle} te ha respondido`;
    }

    return trimmed;
  }

  translateNotificationMessage(message: string): string {
    if (!message) return '';
    const trimmed = message.trim();
    const isEn = this.activeLang() === 'en';

    // 1. Mensaje de donación de shakes
    const shakeMsgMatch = trimmed.match(/(.+?)\s+(?:te\s+apoy[oó]\s+con|bought\s+you|supported\s+you\s+with)\s+(\d+)\s+Shakes?\s+\(([^)]+)\)\.?/i);
    if (shakeMsgMatch) {
      const rawSupporter = shakeMsgMatch[1].trim();
      const count = parseInt(shakeMsgMatch[2] || '1', 10);
      const amountAndCurrency = shakeMsgMatch[3].trim();
      const shakeWord = count === 1 ? 'Shake' : 'Shakes';

      let supporter = rawSupporter;
      if (isEn) {
        if (/^Un Fan$/i.test(supporter)) supporter = 'A Fan';
        else if (/^Alguien an[oó]nimo$/i.test(supporter)) supporter = 'Someone anonymous';
        else if (/^Un Supporter$/i.test(supporter)) supporter = 'A Supporter';
        return `${supporter} supported you with ${count} ${shakeWord} (${amountAndCurrency}).`;
      } else {
        if (/^A Fan$/i.test(supporter)) supporter = 'Un Fan';
        else if (/^Someone anonymous|Anonymous$/i.test(supporter)) supporter = 'Alguien anónimo';
        else if (/^A Supporter$/i.test(supporter)) supporter = 'Un Supporter';
        return `${supporter} te apoyó con ${count} ${shakeWord} (${amountAndCurrency}).`;
      }
    }

    // 2. Mensaje de suscripción
    if (/Un\s+seguidor\s+se\s+acaba\s+de\s+suscribir\s+a\s+tu\s+nivel\s+de\s+membres[ií]a|A\s+supporter\s+just\s+subscribed\s+to\s+your\s+membership\s+tier/i.test(trimmed)) {
      return isEn
        ? 'A supporter just subscribed to your membership tier.'
        : 'Un seguidor se acaba de suscribir a tu nivel de membresía.';
    }

    // 3. Mensaje de nuevo comentario
    const commentMsgMatch = trimmed.match(/(.+?)\s+(?:coment[oó]|commented):\s*(".*"|.*)/i);
    if (commentMsgMatch) {
      const user = commentMsgMatch[1].trim();
      const content = commentMsgMatch[2].trim();
      return isEn ? `${user} commented: ${content}` : `${user} comentó: ${content}`;
    }

    return trimmed;
  }
}

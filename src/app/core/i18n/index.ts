import { TranslationSchema } from './translations';
import { es } from './es';
import { en } from './en';

export type AppLanguage = 'es' | 'en';

export const TRANSLATIONS: Record<AppLanguage, TranslationSchema> = {
  es,
  en,
};

export * from './translations';

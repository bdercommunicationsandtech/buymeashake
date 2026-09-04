// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageService, LANGUAGE_STORAGE_KEY } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
    service = new LanguageService();
  });

  it('debe inicializarse con el idioma por defecto (es) si no hay storage', () => {
    expect(service.lang()).toBe('es');
    expect(service.t().nav.exploreAthletes).toBe('Explorar atletas');
  });

  it('debe alternar de es a en al invocar toggleLanguage', () => {
    service.toggleLanguage();
    expect(service.lang()).toBe('en');
    expect(service.t().nav.exploreAthletes).toBe('Explore athletes');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('debe alternar de en a es al invocar toggleLanguage dos veces', () => {
    service.toggleLanguage();
    expect(service.lang()).toBe('en');
    service.toggleLanguage();
    expect(service.lang()).toBe('es');
    expect(service.t().nav.exploreAthletes).toBe('Explorar atletas');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('debe permitir establecer un idioma específico con setLanguage', () => {
    service.setLanguage('en');
    expect(service.lang()).toBe('en');
    expect(service.t().dashboard.title).toBe('Dashboard');

    service.setLanguage('es');
    expect(service.lang()).toBe('es');
    expect(service.t().dashboard.title).toBe('Panel de Control');
  });

  it('debe respetar el idioma guardado en localStorage al crearse', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const newService = new LanguageService();
    expect(newService.lang()).toBe('en');
    expect(newService.t().common.save).toBe('Save');
  });

  it('debe traducir disciplinas deportivas correctamente según el idioma activo', () => {
    expect(service.translateDiscipline('Fuerza & Levantamiento')).toBe('Fuerza & Levantamiento');
    service.setLanguage('en');
    expect(service.translateDiscipline('Fuerza & Levantamiento')).toBe('Strength & Lifting');
    expect(service.translateDiscipline('CrossFit & Funcional')).toBe('CrossFit & Functional');
  });
});

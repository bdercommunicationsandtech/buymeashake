// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageService, LANGUAGE_STORAGE_KEY } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  const storageStore: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => storageStore[key] ?? null,
    setItem: (key: string, value: string) => {
      storageStore[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete storageStore[key];
    },
    clear: () => {
      for (const k of Object.keys(storageStore)) {
        delete storageStore[k];
      }
    },
  };

  try {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
    if (typeof globalThis !== 'undefined') {
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // Ignore definition errors if already configured
  }

  beforeEach(() => {
    mockStorage.clear();
    try {
      localStorage.clear();
    } catch {
      // Ignored if local storage mock handled it
    }
    Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
    service = new LanguageService();
  });

  it('debe inicializarse con es si navigator.language es es-ES cuando no hay storage', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
    const esService = new LanguageService();
    expect(esService.lang()).toBe('es');
    expect(esService.t().nav.exploreAthletes).toBe('Explorar atletas');
  });

  it('debe inicializarse con en si navigator.language es en-US cuando no hay storage', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true });
    const enService = new LanguageService();
    expect(enService.lang()).toBe('en');
    expect(enService.t().nav.exploreAthletes).toBe('Explore athletes');
  });

  it('debe inicializarse con en si navigator.language es otro idioma internacional (ej. pt-BR o fr-FR)', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'pt-BR', configurable: true });
    const ptService = new LanguageService();
    expect(ptService.lang()).toBe('en');

    Object.defineProperty(window.navigator, 'language', { value: 'fr-FR', configurable: true });
    const frService = new LanguageService();
    expect(frService.lang()).toBe('en');
  });

  it('debe priorizar el idioma guardado en localStorage sobre navigator.language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
    const newService = new LanguageService();
    expect(newService.lang()).toBe('en');
    expect(newService.t().common.save).toBe('Save');

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es');
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true });
    const esService = new LanguageService();
    expect(esService.lang()).toBe('es');
    expect(esService.t().common.save).toBe('Guardar');
  });

  it('debe respetar la clave legacy de almacenamiento buymeashake_lang si no existe la principal', () => {
    localStorage.setItem('buymeashake_lang', 'en');
    Object.defineProperty(window.navigator, 'language', { value: 'es-ES', configurable: true });
    const legacyService = new LanguageService();
    expect(legacyService.lang()).toBe('en');
  });

  it('debe sincronizar el atributo document.documentElement.lang al crearse y al cambiar de idioma', () => {
    service.setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    service.setLanguage('es');
    expect(document.documentElement.lang).toBe('es');
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

  it('debe traducir disciplinas deportivas correctamente según el idioma activo', () => {
    expect(service.translateDiscipline('Fuerza & Levantamiento')).toBe('Fuerza & Levantamiento');
    expect(service.translateDiscipline('Boxeo')).toBe('Boxeo');
    service.setLanguage('en');
    expect(service.translateDiscipline('Fuerza & Levantamiento')).toBe('Strength & Lifting');
    expect(service.translateDiscipline('CrossFit & Funcional')).toBe('CrossFit & Functional');
    expect(service.translateDiscipline('Boxeo')).toBe('Boxing');
  });

  it('debe tener las traducciones de perfil de atleta y posts sincronizadas en ambos idiomas', () => {
    expect(service.t().athlete.athleteRole).toBe('Atleta');
    expect(service.t().athlete.shakesReceived).toBe('Shakes recibidos');
    expect(service.t().post.membersOnly).toBe('Solo Miembros');
    expect(service.t().post.public).toBe('Público');

    service.setLanguage('en');
    expect(service.t().athlete.athleteRole).toBe('Athlete');
    expect(service.t().athlete.shakesReceived).toBe('Shakes received');
    expect(service.t().post.membersOnly).toBe('Members Only');
    expect(service.t().post.public).toBe('Public');
  });

  it('debe tener las traducciones de followModal y shareModal sincronizadas en ambos idiomas', () => {
    expect(service.t().followModal.followTitle).toBe('Seguir a');
    expect(service.t().followModal.followBtn).toBe('Seguir');
    expect(service.t().shareModal.title).toBe('Compartir página');
    expect(service.t().shareModal.white).toBe('Blanco');
    expect(service.t().shareModal.black).toBe('Negro');
    expect(service.t().shareModal.scanMe).toBe('Escanéame');

    service.setLanguage('en');
    expect(service.t().followModal.followTitle).toBe('Follow');
    expect(service.t().followModal.followBtn).toBe('Follow');
    expect(service.t().shareModal.title).toBe('Share page');
    expect(service.t().shareModal.white).toBe('White');
    expect(service.t().shareModal.scanMe).toBe('Scan me');
  });

  it('debe exponer aliases currentLang y currentTranslations para compatibilidad', () => {
    expect(service.currentLang()).toBe('es');
    expect(service.currentTranslations().common.save).toBe('Guardar');

    service.setLanguage('en');
    expect(service.currentLang()).toBe('en');
    expect(service.currentTranslations().common.save).toBe('Save');
  });

  it('debe traducir vistas detalladas del dashboard (supporters, goals, memberships, shop, referrals, posts, payouts)', () => {
    expect(service.t().dashboard.supportersView.donationSettingsTitle).toBe('Configuración de donaciones');
    expect(service.t().dashboard.goalsView.publishGoal).toBe('PUBLICAR META EN MI PERFIL');
    expect(service.t().dashboard.goalsView.notifyGoalPaused).toBe('Meta pausada. Ahora se encuentra en tus metas guardadas.');
    expect(service.t().dashboard.goalsView.notifyGoalActivated).toBe('Meta activada en tu perfil.');
    expect(service.t().dashboard.membershipsView.createTier).toBe('+ Crear Nuevo Nivel');
    expect(service.t().dashboard.shopView.tabProducts).toBe('Productos Digitales');
    expect(service.t().dashboard.referralsView.earnFivePercent).toBe('Gana el 5% de por vida');
    expect(service.t().dashboard.postsView.newPostTitle).toBe('Nueva Publicación');
    expect(service.t().dashboard.postsView.publishNow).toBe('Publicar ahora');
    expect(service.t().dashboard.payoutsView.availableBalance).toBe('Balance Disponible');
    expect(service.t().dashboard.payoutsView.connectStripeToWithdraw).toBe('Conecta Stripe para retirar');
    expect(service.t().dashboard.settingsView.tabProfile).toBe('Perfil de Atleta');
    expect(service.t().dashboard.settingsView.saveProfileBtn).toBe('Guardar Perfil');
    expect(service.t().dashboard.settingsView.newGoalTitle).toBe('Establecer Nueva Meta');
    expect(service.t().dashboard.settingsView.saveSettingsBtn).toBe('Guardar Ajustes');

    service.setLanguage('en');
    expect(service.t().dashboard.supportersView.donationSettingsTitle).toBe('Donation Settings');
    expect(service.t().dashboard.goalsView.publishGoal).toBe('PUBLISH GOAL ON MY PROFILE');
    expect(service.t().dashboard.goalsView.notifyGoalPaused).toBe('Goal paused. It is now in your saved goals.');
    expect(service.t().dashboard.goalsView.notifyGoalActivated).toBe('Goal activated on your profile.');
    expect(service.t().dashboard.membershipsView.createTier).toBe('+ Create New Tier');
    expect(service.t().dashboard.shopView.tabProducts).toBe('Digital Products');
    expect(service.t().dashboard.referralsView.earnFivePercent).toBe('Earn 5% for life');
    expect(service.t().dashboard.postsView.newPostTitle).toBe('New Post');
    expect(service.t().dashboard.postsView.publishNow).toBe('Publish now');
    expect(service.t().dashboard.payoutsView.availableBalance).toBe('Available Balance');
    expect(service.t().dashboard.payoutsView.connectStripeToWithdraw).toBe('Connect Stripe to withdraw');
    expect(service.t().dashboard.settingsView.tabProfile).toBe('Athlete Profile');
    expect(service.t().dashboard.settingsView.saveProfileBtn).toBe('Save Profile');
    expect(service.t().dashboard.settingsView.newGoalTitle).toBe('Set New Goal');
    expect(service.t().dashboard.settingsView.saveSettingsBtn).toBe('Save Settings');
  });

  it('debe tener las traducciones de integrationsView y pageEditorModals sincronizadas en ambos idiomas', () => {
    // ES
    expect(service.t().footer.disclaimer).toContain('replica el diseño de Stripe');
    expect(service.t().onboarding.errorMessage).toBe('No se pudo guardar el perfil. Intenta de nuevo.');
    expect(service.t().dashboard.integrationsView.title).toBe('Integraciones');
    expect(service.t().dashboard.integrationsView.connect).toBe('Conectar');
    expect(service.t().dashboard.integrationsView.configure).toBe('Configurar');
    expect(service.t().pageEditorModals.bannerNotice).toBe('Estás editando tu página pública. Usa los lápices para cambiar cada sección.');
    expect(service.t().pageEditorModals.editProfileTitle).toBe('Editar perfil');
    expect(service.t().pageEditorModals.editAgendaTitle).toBe('Mi agenda');
    expect(service.t().pageEditorModals.editPageTitle).toBe('Editar página');
    expect(service.t().pageEditorModals.editPricesTitle).toBe('Precios de Shakes');
    expect(service.t().pageEditorModals.editGoalTitle).toBe('Meta activa');
    expect(service.t().pageEditorModals.saveChanges).toBe('Guardar cambios');

    // EN
    service.setLanguage('en');
    expect(service.t().footer.disclaimer).toContain('replicates Stripe design');
    expect(service.t().onboarding.errorMessage).toBe('Could not save profile. Please try again.');
    expect(service.t().dashboard.integrationsView.title).toBe('Integrations');
    expect(service.t().dashboard.integrationsView.connect).toBe('Connect');
    expect(service.t().dashboard.integrationsView.configure).toBe('Configure');
    expect(service.t().pageEditorModals.bannerNotice).toBe('You are editing your public page. Use the pencils to change each section.');
    expect(service.t().pageEditorModals.editProfileTitle).toBe('Edit profile');
    expect(service.t().pageEditorModals.editAgendaTitle).toBe('My schedule');
    expect(service.t().pageEditorModals.editPageTitle).toBe('Edit page');
    expect(service.t().pageEditorModals.editPricesTitle).toBe('Shake Prices');
    expect(service.t().pageEditorModals.editGoalTitle).toBe('Active goal');
    expect(service.t().pageEditorModals.saveChanges).toBe('Save changes');
  });

  it('debe traducir reactivamente los títulos de notificaciones y normalizar singular/plural de shakes', () => {
    // ES (por defecto)
    expect(service.translateNotificationTitle('¡Recibiste 1 Shakes!')).toBe('¡Recibiste 1 Shake!');
    expect(service.translateNotificationTitle('¡Recibiste 5 Shakes!')).toBe('¡Recibiste 5 Shakes!');
    expect(service.translateNotificationTitle('1 Shakes received!')).toBe('¡Recibiste 1 Shake!');
    expect(service.translateNotificationTitle('3 Shakes received!')).toBe('¡Recibiste 3 Shakes!');
    expect(service.translateNotificationTitle('¡Nuevo Miembro en tu Comunidad! ⭐️')).toBe('¡Nuevo Miembro en tu Comunidad! ⭐️');
    expect(service.translateNotificationTitle('Nuevo comentario en tu publicación')).toBe('Nuevo comentario en tu publicación');
    expect(service.translateNotificationTitle('@carlosfit te ha respondido')).toBe('@carlosfit te ha respondido');

    // EN
    service.setLanguage('en');
    expect(service.translateNotificationTitle('¡Recibiste 1 Shakes!')).toBe('You received 1 Shake!');
    expect(service.translateNotificationTitle('¡Recibiste 5 Shakes!')).toBe('You received 5 Shakes!');
    expect(service.translateNotificationTitle('1 Shakes received!')).toBe('You received 1 Shake!');
    expect(service.translateNotificationTitle('3 Shakes received!')).toBe('You received 3 Shakes!');
    expect(service.translateNotificationTitle('¡Nuevo Miembro en tu Comunidad! ⭐️')).toBe('New Member in your Community! ⭐️');
    expect(service.translateNotificationTitle('Nuevo comentario en tu publicación')).toBe('New comment on your post');
    expect(service.translateNotificationTitle('@carlosfit te ha respondido')).toBe('@carlosfit replied to you');
  });

  it('debe traducir reactivamente los mensajes de notificaciones y supporters anónimos/fan', () => {
    // Caso de la captura de pantalla del usuario: "Un Fan te apoyó con 1 Shakes ($3.00 USD)."
    // ES
    expect(service.translateNotificationMessage('Un Fan te apoyó con 1 Shakes ($3.00 USD).')).toBe('Un Fan te apoyó con 1 Shake ($3.00 USD).');
    expect(service.translateNotificationMessage('Alguien anónimo te apoyó con 5 Shakes ($15.00 USD).')).toBe('Alguien anónimo te apoyó con 5 Shakes ($15.00 USD).');
    expect(service.translateNotificationMessage('Un seguidor se acaba de suscribir a tu nivel de membresía.')).toBe('Un seguidor se acaba de suscribir a tu nivel de membresía.');
    expect(service.translateNotificationMessage('Juan Pérez comentó: "Gran entrenamiento!"')).toBe('Juan Pérez comentó: "Gran entrenamiento!"');

    // EN
    service.setLanguage('en');
    expect(service.translateNotificationMessage('Un Fan te apoyó con 1 Shakes ($3.00 USD).')).toBe('A Fan supported you with 1 Shake ($3.00 USD).');
    expect(service.translateNotificationMessage('Alguien anónimo te apoyó con 5 Shakes ($15.00 USD).')).toBe('Someone anonymous supported you with 5 Shakes ($15.00 USD).');
    expect(service.translateNotificationMessage('Un seguidor se acaba de suscribir a tu nivel de membresía.')).toBe('A supporter just subscribed to your membership tier.');
    expect(service.translateNotificationMessage('Juan Pérez comentó: "Gran entrenamiento!"')).toBe('Juan Pérez commented: "Gran entrenamiento!"');

    // Mensajes provenientes de backend en inglés también se traducen reactivamente al cambiar idioma a ES
    service.setLanguage('es');
    expect(service.translateNotificationMessage('A Fan bought you 1 Shakes ($3.00 USD).')).toBe('Un Fan te apoyó con 1 Shake ($3.00 USD).');
  });

  it('debe tener las claves de supporterArea sincronizadas en ambos idiomas', () => {
    expect(service.t().supporterArea.supporterAccount).toBe('Cuenta de Seguidor');
    expect(service.t().supporterArea.followingFeed).toBe('Feed de Siguiendo');
    expect(service.t().supporterArea.feedEmptyTitle).toBe('Tu feed está vacío');

    service.setLanguage('en');
    expect(service.t().supporterArea.supporterAccount).toBe('Supporter Account');
    expect(service.t().supporterArea.followingFeed).toBe('Following Feed');
    expect(service.t().supporterArea.feedEmptyTitle).toBe('Your feed is empty');
  });
});


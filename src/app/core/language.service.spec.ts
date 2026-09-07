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
});


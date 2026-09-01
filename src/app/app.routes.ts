import { Routes } from '@angular/router';

export const routes: Routes = [
  // 1. Flujo Público
  {
    path: '',
    title: 'buymeashake — Invita un shake a tus atletas favoritos',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'explore',
    title: 'Explorar atletas — buymeashake',
    loadComponent: () => import('./features/explore/explore').then((m) => m.Explore),
  },

  // 2. Flujo de Autenticación y Onboarding
  {
    path: 'auth/login',
    title: 'Iniciar sesión — buymeashake',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/register',
    title: 'Crear cuenta de atleta — buymeashake',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'onboarding',
    title: 'Configura tu perfil — buymeashake',
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },

  // 3. Panel de Control del Creador (Dashboard)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/layout/layout').then((m) => m.DashboardLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        title: 'Inicio — Dashboard',
        loadComponent: () => import('./features/dashboard/home/home').then((m) => m.DashboardHome),
      },
      {
        path: 'supporters',
        title: 'Supporters — Dashboard',
        loadComponent: () => import('./features/dashboard/supporters/supporters').then((m) => m.DashboardSupporters),
      },
      {
        path: 'memberships',
        title: 'Memberships — Dashboard',
        loadComponent: () => import('./features/dashboard/memberships/memberships').then((m) => m.DashboardMemberships),
      },
      {
        path: 'shop',
        title: 'Tienda Fitness — Dashboard',
        loadComponent: () => import('./features/dashboard/shop/shop').then((m) => m.DashboardShop),
      },
      {
        path: 'posts/new',
        title: 'Nueva Publicación — Dashboard',
        loadComponent: () => import('./features/dashboard/posts/post-new/post-new').then((m) => m.DashboardPostNew),
      },
      {
        path: 'posts',
        title: 'Publicaciones — Dashboard',
        loadComponent: () => import('./features/dashboard/posts/posts').then((m) => m.DashboardPosts),
      },
      {
        path: 'referrals',
        title: 'Programa de Referidos — Dashboard',
        loadComponent: () => import('./features/dashboard/referrals/referrals').then((m) => m.DashboardReferrals),
      },
      {
        path: 'buttons-graphics',
        title: 'Botones y Widgets — Dashboard',
        loadComponent: () => import('./features/dashboard/buttons-graphics/buttons-graphics').then((m) => m.DashboardButtonsGraphics),
      },
      {
        path: 'integrations',
        title: 'Integraciones — Dashboard',
        loadComponent: () => import('./features/dashboard/integrations/integrations').then((m) => m.DashboardIntegrations),
      },
      {
        path: 'payouts',
        title: 'Retiros y Pagos Stripe — Dashboard',
        loadComponent: () => import('./features/dashboard/payouts/payouts').then((m) => m.DashboardPayouts),
      },
      {
        path: 'settings',
        title: 'Ajustes de la cuenta — Dashboard',
        loadComponent: () => import('./features/dashboard/settings/settings').then((m) => m.DashboardSettings),
      }
    ]
  },

  // 4. Perfil Público del Creador (Catch dynamic user handles like /sofifit or /yahirruiz)
  {
    path: ':username',
    title: 'Perfil de atleta — buymeashake',
    loadComponent: () => import('./features/creator/creator').then((m) => m.Creator),
  },

  // Fallback
  {
    path: '**',
    redirectTo: '',
  },
];

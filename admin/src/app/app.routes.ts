import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/user-catalog.component').then((m) => m.UserCatalogComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-panel.component').then((m) => m.ReportsPanelComponent),
      },
      {
        path: 'banners',
        loadComponent: () =>
          import('./features/banners/banners-panel.component').then((m) => m.BannersPanelComponent),
      },
      {
        path: 'disciplines',
        loadComponent: () =>
          import('./features/disciplines/disciplines-panel.component').then(
            (m) => m.DisciplinesPanelComponent,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact-panel.component').then((m) => m.ContactPanelComponent),
      },
      {
        path: 'blacklist',
        loadComponent: () =>
          import('./features/blacklist/blacklist-panel.component').then((m) => m.BlacklistPanelComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

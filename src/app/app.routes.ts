import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'buymeashake.fit — Invita un shake, no un café',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'widget',
    title: 'Laboratorio de widgets — buymeashake.fit',
    loadComponent: () => import('./features/widget-lab/widget-lab').then((m) => m.WidgetLab),
  },
  {
    path: 'sofia',
    title: 'Sofía Ramírez — buymeashake.fit',
    loadComponent: () => import('./features/creator/creator').then((m) => m.Creator),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

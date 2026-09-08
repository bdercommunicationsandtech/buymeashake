import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8">
      <header class="mb-8">
        <div class="mb-1 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-blue-500"></span>
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Vista General</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          Bienvenido al panel de administración de BuyMeAShake.
        </p>
      </header>

      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p class="text-lg font-semibold text-slate-900">
          Hola, {{ auth.user()?.full_name || auth.user()?.first_name || 'Admin' }}.
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Tu sesión de administrador está activa. Los módulos de gestión se irán agregando aquí.
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          @for (role of auth.user()?.roles || []; track role) {
            <span
              class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200"
            >
              {{ role }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
}

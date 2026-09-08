import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { StatsService } from '../../core/services/stats.service';
import { PlatformStats } from '../../core/models/stats.model';
import { AuthService } from '../../core/services/auth.service';

function asNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Circumference of donut circle (r=15.9 in viewBox 36x36). */
const DONUT_C = 2 * Math.PI * 15.9;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  providers: [DatePipe],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8">
      <header class="mb-8">
        <div class="mb-1 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-blue-500"></span>
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Vista General</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          KPIs de la plataforma BuyMeAShake.
          @if (auth.user(); as u) {
            <span class="text-slate-400"> · {{ u.full_name || u.first_name }}</span>
          }
        </p>
      </header>

      @if (loading()) {
        <div class="flex items-center justify-center py-24">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          <p class="font-semibold">Error al cargar estadísticas</p>
          <p class="mt-1 text-sm">{{ error() }}</p>
          <button
            type="button"
            (click)="load()"
            class="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      } @else if (stats(); as s) {
        <!-- KPI cards usuarios -->
        <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-200/40 transition-transform hover:-translate-y-1"
          >
            <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10"></div>
            <p class="text-sm font-medium text-blue-100">Total usuarios</p>
            <p class="mt-2 text-4xl font-bold">{{ s.users.total | number }}</p>
            <p class="mt-1 text-xs text-blue-200">Supporters + atletas</p>
          </div>

          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white shadow-lg shadow-emerald-200/40 transition-transform hover:-translate-y-1"
          >
            <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10"></div>
            <p class="text-sm font-medium text-emerald-100">Supporters</p>
            <p class="mt-2 text-4xl font-bold">{{ s.users.supporters | number }}</p>
            <p class="mt-1 text-xs text-emerald-200">Rol de producto activo</p>
          </div>

          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-6 text-white shadow-lg shadow-violet-200/40 transition-transform hover:-translate-y-1"
          >
            <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10"></div>
            <p class="text-sm font-medium text-violet-200">Atletas</p>
            <p class="mt-2 text-4xl font-bold">{{ s.users.athletes | number }}</p>
            <p class="mt-1 text-xs text-violet-300">Rol de producto activo</p>
          </div>
        </div>

        <!-- Charts row -->
        <div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <!-- Users donut -->
          <div
            class="col-span-1 flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2"
          >
            <h2 class="mb-1 self-start text-sm font-semibold uppercase tracking-wider text-slate-500">
              Distribución de usuarios
            </h2>
            <p class="mb-4 self-start text-xs text-slate-400">Supporters vs atletas</p>

            <div class="relative flex items-center justify-center py-2">
              <svg class="h-48 w-48" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9" fill="none" class="stroke-slate-100" stroke-width="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  class="stroke-emerald-500 transition-all duration-700 ease-out"
                  stroke-width="3"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="usersDonut().supportersDash"
                  [attr.stroke-dashoffset]="usersDonut().supportersOffset"
                  transform="rotate(-90 18 18)"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  class="stroke-violet-600 transition-all duration-700 ease-out"
                  stroke-width="3"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="usersDonut().athletesDash"
                  [attr.stroke-dashoffset]="usersDonut().athletesOffset"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div class="pointer-events-none absolute flex flex-col items-center">
                <span class="text-3xl font-bold text-slate-900">{{ s.users.total | number }}</span>
                <span class="text-xs text-slate-400">usuarios</span>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap justify-center gap-6">
              <div class="flex items-center gap-2">
                <span class="inline-block h-3 w-3 rounded-full bg-emerald-500"></span>
                <span class="text-sm text-slate-600">
                  Supporters
                  <strong class="text-slate-900">{{ s.users.supporters | number }}</strong>
                  <span class="text-slate-400">({{ usersDonut().supportersPct }}%)</span>
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block h-3 w-3 rounded-full bg-violet-600"></span>
                <span class="text-sm text-slate-600">
                  Atletas
                  <strong class="text-slate-900">{{ s.users.athletes | number }}</strong>
                  <span class="text-slate-400">({{ usersDonut().athletesPct }}%)</span>
                </span>
              </div>
            </div>
          </div>

          <!-- GMV bars -->
          <div
            class="col-span-1 flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3"
          >
            <div class="mb-1 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">GMV por tipo</h2>
                <p class="text-xs text-slate-400">
                  Transacciones exitosas (all-time) · {{ s.gmv.successful_count | number }} pagos
                </p>
              </div>
              <p class="text-xl font-extrabold tracking-tight text-slate-900">
                {{ money(s.gmv.total) | number: '1.2-2' }}
                <span class="text-sm font-semibold text-slate-500">{{ s.gmv.currency }}</span>
              </p>
            </div>

            <div class="my-auto flex flex-col gap-5 py-4">
              @for (bar of gmvBars(); track bar.key) {
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-semibold text-slate-700">{{ bar.label }}</span>
                    <span class="font-extrabold text-slate-900">
                      {{ bar.value | number: '1.2-2' }}
                      <span class="text-xs font-medium text-slate-500">{{ s.gmv.currency }}</span>
                    </span>
                  </div>
                  <div class="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      [class]="bar.barClass"
                      [style.width.%]="bar.percent"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- GMV detail cards -->
        <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Shakes</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              {{ money(s.gmv.shakes) | number: '1.2-2' }}
              <span class="text-xs font-medium text-slate-500">{{ s.gmv.currency }}</span>
            </p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Membresías</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              {{ money(s.gmv.memberships) | number: '1.2-2' }}
              <span class="text-xs font-medium text-slate-500">{{ s.gmv.currency }}</span>
            </p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Shop</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              {{ money(s.gmv.shop) | number: '1.2-2' }}
              <span class="text-xs font-medium text-slate-500">{{ s.gmv.currency }}</span>
            </p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Bookings</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              {{ money(s.gmv.bookings) | number: '1.2-2' }}
              <span class="text-xs font-medium text-slate-500">{{ s.gmv.currency }}</span>
            </p>
          </div>
        </div>

        <!-- Recent supporters + athletes -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Últimos 10 supporters
                </h2>
              </div>
            </div>
            @if (s.recent_supporters.length === 0) {
              <p class="px-6 py-8 text-center text-sm text-slate-400">Aún no hay supporters registrados.</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th class="px-4 py-3 text-left">Usuario</th>
                      <th class="hidden px-4 py-3 text-left md:table-cell">Email</th>
                      <th class="px-4 py-3 text-left">Registro</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (u of s.recent_supporters; track u.id) {
                      <tr class="transition-colors hover:bg-slate-50">
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <div
                              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
                            >
                              {{ (u.full_name?.[0] || u.email?.[0] || '?').toUpperCase() }}
                            </div>
                            <span class="font-medium text-slate-800">{{ u.full_name }}</span>
                          </div>
                        </td>
                        <td class="hidden px-4 py-3 text-slate-500 md:table-cell">{{ u.email }}</td>
                        <td class="px-4 py-3 text-slate-500">
                          {{ u.created_at ? (u.created_at | date: 'dd/MM/yyyy') : '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
                <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Últimos 10 atletas
                </h2>
              </div>
            </div>
            @if (s.recent_athletes.length === 0) {
              <p class="px-6 py-8 text-center text-sm text-slate-400">Aún no hay atletas registrados.</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th class="px-4 py-3 text-left">Atleta</th>
                      <th class="hidden px-4 py-3 text-left lg:table-cell">Handle</th>
                      <th class="hidden px-4 py-3 text-left md:table-cell">Email</th>
                      <th class="px-4 py-3 text-left">Registro</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (u of s.recent_athletes; track u.id) {
                      <tr class="transition-colors hover:bg-slate-50">
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <div
                              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white"
                            >
                              {{ (u.full_name?.[0] || u.email?.[0] || '?').toUpperCase() }}
                            </div>
                            <span class="font-medium text-slate-800">{{ u.full_name }}</span>
                          </div>
                        </td>
                        <td class="hidden px-4 py-3 text-slate-500 lg:table-cell">
                          @if (u.athlete_handle) {
                            <span class="font-medium text-violet-700">&#64;{{ u.athlete_handle }}</span>
                          } @else {
                            <span class="text-slate-400">—</span>
                          }
                        </td>
                        <td class="hidden px-4 py-3 text-slate-500 md:table-cell">{{ u.email }}</td>
                        <td class="px-4 py-3 text-slate-500">
                          {{ u.created_at ? (u.created_at | date: 'dd/MM/yyyy') : '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly statsApi = inject(StatsService);
  protected readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly stats = signal<PlatformStats | null>(null);

  readonly usersDonut = computed(() => {
    const s = this.stats();
    const supporters = s?.users.supporters ?? 0;
    const athletes = s?.users.athletes ?? 0;
    const total = supporters + athletes;

    if (total <= 0) {
      return {
        supportersDash: `0 ${DONUT_C}`,
        supportersOffset: 0,
        athletesDash: `0 ${DONUT_C}`,
        athletesOffset: 0,
        supportersPct: 0,
        athletesPct: 0,
      };
    }

    const supportersLen = (supporters / total) * DONUT_C;
    const athletesLen = (athletes / total) * DONUT_C;

    return {
      supportersDash: `${supportersLen} ${DONUT_C}`,
      supportersOffset: 0,
      athletesDash: `${athletesLen} ${DONUT_C}`,
      // Offset so the athletes arc starts after supporters
      athletesOffset: -supportersLen,
      supportersPct: Math.round((supporters / total) * 100),
      athletesPct: Math.round((athletes / total) * 100),
    };
  });

  readonly gmvBars = computed(() => {
    const s = this.stats();
    const items = [
      {
        key: 'shakes',
        label: 'Shakes',
        value: asNumber(s?.gmv.shakes),
        barClass: 'bg-gradient-to-r from-sky-400 to-blue-600',
      },
      {
        key: 'memberships',
        label: 'Membresías',
        value: asNumber(s?.gmv.memberships),
        barClass: 'bg-gradient-to-r from-emerald-400 to-teal-600',
      },
      {
        key: 'shop',
        label: 'Shop',
        value: asNumber(s?.gmv.shop),
        barClass: 'bg-gradient-to-r from-amber-400 to-orange-600',
      },
      {
        key: 'bookings',
        label: 'Bookings',
        value: asNumber(s?.gmv.bookings),
        barClass: 'bg-gradient-to-r from-violet-400 to-violet-700',
      },
    ];
    const max = Math.max(...items.map((i) => i.value), 0);
    return items.map((i) => ({
      ...i,
      percent: max > 0 ? Math.max((i.value / max) * 100, i.value > 0 ? 4 : 0) : 0,
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  money(value: number | string): number {
    return asNumber(value);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.statsApi.getPlatformStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          err?.error?.error?.message ||
          err?.error?.detail ||
          err?.message ||
          'No se pudieron cargar las estadísticas.';
        this.error.set(typeof msg === 'string' ? msg : 'No se pudieron cargar las estadísticas.');
        this.loading.set(false);
      },
    });
  }
}

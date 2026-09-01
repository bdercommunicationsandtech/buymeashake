import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';

@Component({
  selector: 'app-supporter-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#fafafb] dark:bg-[#090c0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      <!-- Topbar del Supporter Portal -->
      <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#121614]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 px-5 sm:px-10 h-16 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-[#c9ff3d] text-[#070a08] font-bold shadow-xs">
            <svg viewBox="0 0 32 32" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round">
              <rect x="12" y="4" width="8" height="4" rx="2" fill="currentColor" stroke="none" />
              <path d="M10 10h12l-1.4 16a4 4 0 0 1-4 3.6h-1.2a4 4 0 0 1-4-3.6z" />
              <path d="M11 20h10" stroke-linecap="round" />
            </svg>
          </span>
          <span class="font-display text-lg font-black tracking-tight text-gray-950 dark:text-white hidden sm:inline">
            buymeashake.fit
          </span>
        </a>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 grid place-items-center hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            @if (themeService.currentTheme() === 'dark') {
              <svg class="w-4 h-4 text-[#c9ff3d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <a
            routerLink="/auth/register"
            class="rounded-xl bg-[#c9ff3d] hover:bg-[#bbf033] px-3.5 sm:px-4 py-2 text-xs font-black text-gray-950 transition shadow-xs"
          >
            ⚡ Become a creator
          </a>
        </div>
      </header>

      <!-- Layout 2 Columnas (Estilo Buy Me a Coffee "My account") -->
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- Sidebar Izquierdo de Navegación -->
        <aside class="md:col-span-3 space-y-1">
          <nav class="bg-white dark:bg-[#121614] rounded-3xl p-3 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1 text-xs font-bold">
            <a
              routerLink="/fan/home"
              class="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <span>Home (Feed)</span>
            </a>

            <a
              routerLink="/fan/account"
              class="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[#fff9e6] dark:bg-white/10 text-gray-950 dark:text-[#c9ff3d] font-black border-l-4 border-[#f5b300]"
            >
              <svg class="w-4 h-4 text-[#f5b300]" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              <span>My account</span>
            </a>
          </nav>
        </aside>

        <!-- Columna Central: Formulario de Perfil & Seguridad -->
        <div class="md:col-span-9 space-y-6">
          <div>
            <h1 class="font-display text-2xl font-black text-gray-950 dark:text-white">
              My account
            </h1>
            <p class="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
              Edit profile & Security
            </p>
          </div>

          <!-- Card Personal Info (Fiel a Captura BMC) -->
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-6">
            <h2 class="font-display text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
              Personal Info
            </h2>

            @if (successMessage()) {
              <div class="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {{ successMessage() }}
              </div>
            }

            @if (errorMessage()) {
              <div class="rounded-2xl bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400">
                {{ errorMessage() }}
              </div>
            }

            <!-- Avatar -->
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 rounded-full bg-amber-800 text-white grid place-items-center font-black text-xl shadow-xs border-2 border-white dark:border-white/10">
                🥤
              </div>
              <div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">Foto de Perfil</p>
                <p class="text-[11px] text-gray-400">Tu avatar en comentarios y mensajes de apoyo</p>
              </div>
            </div>

            <!-- Inputs -->
            <div class="space-y-4 pt-2">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  [(ngModel)]="fullName"
                  placeholder="Tu nombre o usuario"
                  class="block w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl bg-gray-50 dark:bg-[#191c1d] text-gray-900 dark:text-white text-sm font-semibold focus:bg-white focus:border-[#c9ff3d] outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  [value]="email()"
                  disabled
                  class="block w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-semibold cursor-not-allowed"
                />
              </div>

              <!-- Asignar o Cambiar Contraseña -->
              <div class="pt-4 border-t border-gray-100 dark:border-white/5">
                <h3 class="font-display text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-3">
                  Seguridad (Establecer Contraseña)
                </h3>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Nueva Contraseña (opcional para entrar con clave fija)
                </label>
                <input
                  type="password"
                  [(ngModel)]="newPassword"
                  placeholder="•••••••••••• (mínimo 8 caracteres)"
                  class="block w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl bg-gray-50 dark:bg-[#191c1d] text-gray-900 dark:text-white text-sm font-semibold focus:bg-white focus:border-[#c9ff3d] outline-none transition"
                />
                <p class="text-[11px] text-gray-400 mt-1">
                  Si dejas este campo vacío, tu método de acceso seguirá siendo mediante código OTP al correo.
                </p>
              </div>
            </div>

            <!-- Botón Guardar -->
            <div class="pt-4">
              <button
                type="button"
                (click)="saveChanges()"
                [disabled]="saving()"
                class="rounded-2xl bg-[#ffd43f] hover:bg-[#f5c623] px-8 py-3.5 text-xs sm:text-sm font-black text-gray-950 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {{ saving() ? 'Guardando...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  `,
})
export class SupporterAccountComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  readonly email = signal<string>('');
  fullName = '';
  newPassword = '';

  readonly saving = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.authService.loadMe().subscribe({
      next: (user) => {
        this.email.set(user.email);
        this.fullName = user.full_name;
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la información del usuario.');
      },
    });
  }

  saveChanges(): void {
    this.saving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const payload: { full_name?: string; password?: string } = {
      full_name: this.fullName.trim() || undefined,
    };

    if (this.newPassword.trim()) {
      if (this.newPassword.trim().length < 8) {
        this.saving.set(false);
        this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      payload.password = this.newPassword.trim();
    }

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('¡Tus cambios han sido guardados exitosamente!');
        this.newPassword = '';
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar los cambios.');
      },
    });
  }
}

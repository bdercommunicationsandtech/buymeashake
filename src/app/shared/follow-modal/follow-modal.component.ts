import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-follow-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" role="dialog" aria-modal="true">
        <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-200/80 dark:border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-150">
          
          <!-- Botón Cerrar -->
          <button
            type="button"
            (click)="closeModal()"
            class="absolute top-5 right-5 h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white grid place-items-center text-xs font-bold transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900 text-xs font-bold text-red-600 dark:text-red-400">
              {{ errorMessage() }}
            </div>
          }

          <!-- PASO 1: Ingreso de Nombre y Correo -->
          @if (step() === 'form') {
            <div class="space-y-5">
              <div>
                <h3 class="font-display text-xl font-black text-gray-950 dark:text-white">
                  Seguir a <span class="text-emerald-600 dark:text-[#c9ff3d]">{{ athleteName() }}</span>
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Recibe sus rutinas, actualizaciones de entrenamientos y novedades en tu feed.
                </p>
              </div>

              <div class="space-y-3.5">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Tu Nombre o &#64;usuario (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Fit"
                    [(ngModel)]="name"
                    class="block w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl shadow-xs bg-white dark:bg-[#191c1d] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-[#c9ff3d] text-sm font-semibold"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    [(ngModel)]="email"
                    class="block w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-xl shadow-xs bg-white dark:bg-[#191c1d] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-[#c9ff3d] text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="button"
                (click)="sendOtp()"
                [disabled]="!email.trim() || isSendingOtp()"
                class="w-full rounded-2xl bg-[#c9ff3d] hover:bg-[#bbf033] py-3.5 text-xs sm:text-sm font-black text-gray-950 shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                @if (isSendingOtp()) {
                  <span class="inline-block h-4 w-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Enviando código...</span>
                } @else {
                  <span>Seguir</span>
                }
              </button>

              <p class="text-[11px] text-gray-400 text-center font-medium">
                Te enviaremos un código de acceso rápido a tu bandeja de correo.
              </p>
            </div>
          }

          <!-- PASO 2: Verificación de Código OTP (Check your inbox) -->
          @if (step() === 'otp') {
            <div class="space-y-5 text-center">
              
              <!-- Icono de Correo / Buzón -->
              <div class="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-white/10 text-emerald-600 dark:text-[#c9ff3d] grid place-items-center mx-auto border border-emerald-200/50 dark:border-white/10">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>

              <div>
                <h3 class="font-display text-xl font-black text-gray-950 dark:text-white">Revisa tu correo</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ingresa el código de 6 dígitos que enviamos a <strong class="text-gray-900 dark:text-white">{{ email }}</strong>
                </p>
              </div>

              <!-- Input OTP con Soporte Total para Pegar (Paste), Auto-Focus y Navegación Fluida -->
              <div class="relative flex items-center justify-center my-6">
                <!-- Input Real Invisible pero Enfocable -->
                <input
                  #otpInputElement
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="6"
                  autocomplete="one-time-code"
                  [(ngModel)]="otpRaw"
                  (input)="onRawOtpChange($any($event.target).value)"
                  (paste)="onPaste($event)"
                  class="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                  autofocus
                />

                <!-- 6 Casillas Visuales Interactivas -->
                <div class="flex items-center gap-2 sm:gap-3 pointer-events-none">
                  @for (slot of otpSlots; track $index) {
                    <div
                      class="h-13 w-10 sm:h-14 sm:w-12 rounded-2xl border-2 grid place-items-center font-display text-xl sm:text-2xl font-black transition-all"
                      [class]="
                        otpRaw().length === $index
                          ? 'border-[#c9ff3d] bg-[#c9ff3d]/10 text-[#c9ff3d] scale-105 shadow-sm shadow-[#c9ff3d]/20'
                          : otpRaw()[$index]
                            ? 'border-gray-300 dark:border-white/30 bg-white dark:bg-[#191c1d] text-gray-950 dark:text-white'
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400'
                      "
                    >
                      @if (otpRaw()[$index]) {
                        <span>{{ otpRaw()[$index] }}</span>
                      } @else if (otpRaw().length === $index) {
                        <span class="inline-block w-0.5 h-6 bg-[#c9ff3d] animate-pulse"></span>
                      } @else {
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-white/20"></span>
                      }
                    </div>
                  }
                </div>
              </div>

              <button
                type="button"
                (click)="verifyOtp()"
                [disabled]="otpRaw().length < 6 || isVerifying()"
                class="w-full rounded-2xl bg-[#c9ff3d] hover:bg-[#bbf033] py-3.5 text-xs sm:text-sm font-black text-gray-950 shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                @if (isVerifying()) {
                  <span class="inline-block h-4 w-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Verificando código...</span>
                } @else {
                  <span>Confirmar y Seguir</span>
                }
              </button>

              <div class="text-xs text-gray-400">
                <span>¿No recibiste el código? </span>
                <button type="button" (click)="sendOtp()" class="font-bold text-gray-900 dark:text-white hover:underline cursor-pointer">
                  Reenviar código
                </button>
              </div>
            </div>
          }

        </div>
      </div>
    }
  `,
})
export class FollowModalComponent {
  private readonly authService = inject(AuthService);

  readonly open = input<boolean>(false);
  readonly athleteName = input<string>('el Atleta');
  readonly athleteHandle = input<string>('');

  readonly onClose = output<void>();
  readonly onFollowSuccess = output<{ email: string; name: string }>();

  readonly step = signal<'form' | 'otp'>('form');
  readonly otpRaw = signal<string>('');
  readonly isSendingOtp = signal<boolean>(false);
  readonly isVerifying = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  name = '';
  email = '';
  readonly otpSlots = [0, 1, 2, 3, 4, 5];

  closeModal(): void {
    this.step.set('form');
    this.otpRaw.set('');
    this.errorMessage.set(null);
    this.onClose.emit();
  }

  sendOtp(): void {
    if (!this.email.trim()) return;

    this.isSendingOtp.set(true);
    this.errorMessage.set(null);

    this.authService
      .requestOtp({
        email: this.email.trim(),
        name: this.name.trim() || undefined,
        athlete_handle: this.athleteHandle() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isSendingOtp.set(false);
          this.step.set('otp');
          this.otpRaw.set('');
          if (res.demo_code) {
            console.log(`[OTP CÓDIGO ENVIADO]: ${res.demo_code}`);
          }
        },
        error: (err) => {
          this.isSendingOtp.set(false);
          this.errorMessage.set(err.error?.message || 'Error al enviar código de verificación');
        },
      });
  }

  onRawOtpChange(value: string): void {
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    this.otpRaw.set(sanitized);

    if (sanitized.length === 6) {
      this.verifyOtp();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const cleanDigits = pastedText.replace(/\D/g, '').slice(0, 6);
    if (cleanDigits) {
      this.otpRaw.set(cleanDigits);
      if (cleanDigits.length === 6) {
        this.verifyOtp();
      }
    }
  }

  verifyOtp(): void {
    const code = this.otpRaw().trim();
    if (code.length < 6 || this.isVerifying()) return;

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    this.authService
      .verifyOtp({
        email: this.email.trim(),
        code: code,
      })
      .subscribe({
        next: () => {
          this.isVerifying.set(false);
          this.onFollowSuccess.emit({ email: this.email, name: this.name || 'Supporter' });
          this.closeModal();
        },
        error: (err) => {
          this.isVerifying.set(false);
          this.errorMessage.set(err.error?.message || 'El código es incorrecto o ha expirado.');
        },
      });
  }
}


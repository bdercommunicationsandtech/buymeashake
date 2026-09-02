import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  otpCode = '';

  readonly loginMode = signal<'password' | 'otp'>('password');
  readonly otpStep = signal<'email' | 'verify'>('email');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user) {
        this.infoMessage.set('Ya tienes una sesión activa. Redirigiendo…');
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  setLoginMode(mode: 'password' | 'otp'): void {
    this.loginMode.set(mode);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  onSubmit(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getDefaultRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        this.errorMessage.set(msg);
      },
    });
  }

  sendLoginOtp(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (!this.email.trim()) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.auth.requestOtp({ email: this.email.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpStep.set('verify');
        this.otpCode = '';
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al enviar código de acceso.');
      },
    });
  }

  onOtpInput(val: string): void {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    this.otpCode = clean;
    if (clean.length === 6) {
      this.verifyLoginOtp();
    }
  }

  verifyLoginOtp(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (this.otpCode.length < 6 || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.auth.verifyOtp({ email: this.email.trim(), code: this.otpCode.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getDefaultRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'El código es inválido o ha expirado.');
      },
    });
  }

  private redirectIfAlreadyLoggedIn(): boolean {
    if (!this.auth.isAuthenticated() && !this.auth.getAccessToken()) {
      return false;
    }

    this.infoMessage.set('Ya tienes una sesión activa. Redirigiendo…');
    this.errorMessage.set(null);

    if (this.auth.currentUser()) {
      void this.router.navigateByUrl(this.auth.getDefaultRoute());
      return true;
    }

    this.auth.loadMe().subscribe({
      next: () => this.router.navigateByUrl(this.auth.getDefaultRoute()),
      error: () => {
        this.infoMessage.set(null);
        this.auth.clearSession(false);
      },
    });
    return true;
  }
}

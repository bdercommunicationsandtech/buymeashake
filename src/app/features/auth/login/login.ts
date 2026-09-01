import { Component, inject, signal } from '@angular/core';
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

  setLoginMode(mode: 'password' | 'otp'): void {
    this.loginMode.set(mode);
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

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
    if (!this.email.trim()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

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
    if (this.otpCode.length < 6 || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.verifyOtp({ email: this.email.trim(), code: this.otpCode.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.redirectByUserRole();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'El código es inválido o ha expirado.');
      },
    });
  }

  private redirectByUserRole(): void {
    this.auth.loadMe().subscribe({
      next: (me) => {
        if (me.role === 'supporter') {
          this.router.navigate(['/fan/home']);
        } else {
          this.router.navigate(['/dashboard/home']);
        }
      },
      error: () => {
        this.router.navigate(['/fan/home']);
      },
    });
  }
}

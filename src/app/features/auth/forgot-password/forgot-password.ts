import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';
import { ThemeService } from '../../../core/theme.service';

type ErrorDescriptor =
  | { type: 'rateLimit'; seconds: number }
  | { type: 'maxAttempts' }
  | { type: 'remainingAttempts'; remaining: number }
  | { type: 'invalidOtp' }
  | { type: 'invalidEmailFormat' }
  | { type: 'fillAllFields' }
  | { type: 'passwordMismatch' }
  | { type: 'passwordMinLength' }
  | { type: 'sendCode' }
  | { type: 'resetGeneral' }
  | { type: 'custom'; message: string };

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly t = this.i18n.t;

  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';

  readonly step = signal<'email' | 'reset' | 'success'>('email');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorState = signal<ErrorDescriptor | null>(null);
  readonly resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user) {
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  readonly errorMessage = computed<string | null>(() => {
    const err = this.errorState();
    if (!err) return null;
    const auth = this.t().auth;
    switch (err.type) {
      case 'rateLimit':
        return auth.rateLimitWait.replace('{seconds}', err.seconds.toString());
      case 'maxAttempts':
        return auth.maxAttemptsError;
      case 'remainingAttempts':
        return auth.remainingAttemptsError.replace('{remaining}', err.remaining.toString());
      case 'invalidOtp':
        return auth.invalidOtpError;
      case 'invalidEmailFormat':
        return auth.invalidEmailFormat;
      case 'fillAllFields':
        return auth.fillAllFieldsError;
      case 'passwordMismatch':
        return auth.passwordMismatchError;
      case 'passwordMinLength':
        return auth.passwordMinLengthError;
      case 'sendCode':
        return auth.forgotSendCodeError;
      case 'resetGeneral':
        return auth.forgotResetError;
      case 'custom':
        return err.message;
    }
  });

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  sendCode(): void {
    this.errorState.set(null);
    const clean = this.email.trim().toLowerCase();
    if (!this.isValidEmail(clean)) {
      this.errorState.set({ type: 'invalidEmailFormat' });
      return;
    }
    if (this.resendCooldown() > 0) {
      this.step.set('reset');
      return;
    }

    this.loading.set(true);
    this.auth.forgotPassword({ email: clean }).subscribe({
      next: () => {
        this.email = clean;
        this.loading.set(false);
        this.code = '';
        this.startResendCooldown(60);
        this.step.set('reset');
      },
      error: (err) => {
        this.loading.set(false);
        this.applyApiError(err, 'sendCode');
      },
    });
  }

  resendCode(): void {
    if (this.resendCooldown() > 0 || this.loading()) return;
    this.sendCode();
  }

  submitReset(): void {
    this.errorState.set(null);
    if (!this.code.trim() || !this.newPassword || !this.confirmPassword) {
      this.errorState.set({ type: 'fillAllFields' });
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorState.set({ type: 'passwordMinLength' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorState.set({ type: 'passwordMismatch' });
      return;
    }

    this.loading.set(true);
    this.auth
      .resetPassword({
        email: this.email.trim().toLowerCase(),
        code: this.code.trim(),
        new_password: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.step.set('success');
        },
        error: (err) => {
          this.loading.set(false);
          this.applyApiError(err, 'resetGeneral');
        },
      });
  }

  changeEmail(): void {
    this.step.set('email');
    this.code = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorState.set(null);
  }

  onCodeInput(value: string): void {
    this.code = value.replace(/\D/g, '').slice(0, 6);
  }

  private startResendCooldown(seconds: number): void {
    this.clearCooldown();
    this.resendCooldown.set(Math.min(Math.max(1, seconds), 60));
    this.cooldownInterval = setInterval(() => {
      const next = this.resendCooldown() - 1;
      if (next <= 0) {
        this.clearCooldown();
        this.resendCooldown.set(0);
        return;
      }
      this.resendCooldown.set(next);
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  private applyApiError(err: unknown, fallback: 'sendCode' | 'resetGeneral'): void {
    const errorObj = (err as { error?: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } })
      ?.error?.error;
    const details = errorObj?.details || {};
    const code = errorObj?.code;
    const message = errorObj?.message;

    if (code === 'RATE_LIMIT_EXCEEDED' || (err as { status?: number })?.status === 429) {
      const wait = Math.min(Math.max(1, Number(details['wait_seconds']) || this.resendCooldown() || 60), 60);
      this.startResendCooldown(wait);
      this.errorState.set({ type: 'rateLimit', seconds: wait });
      if (this.step() === 'email') {
        this.step.set('reset');
      }
      return;
    }

    if ((err as { status?: number })?.status === 401 || code === 'UNAUTHORIZED') {
      if (details['max_attempts_exceeded']) {
        this.errorState.set({ type: 'maxAttempts' });
        return;
      }
      if (details['remaining_attempts'] !== undefined) {
        this.errorState.set({
          type: 'remainingAttempts',
          remaining: Number(details['remaining_attempts']),
        });
        return;
      }
      if (details['invalid_otp']) {
        this.errorState.set({ type: 'invalidOtp' });
        return;
      }
    }

    if (message) {
      this.errorState.set({ type: 'custom', message });
      return;
    }

    this.errorState.set({ type: fallback });
  }
}

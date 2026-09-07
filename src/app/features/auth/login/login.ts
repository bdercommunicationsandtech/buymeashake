import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user) {
        this.infoMessage.set(this.t().auth.activeSessionRedirect);
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  onSubmit(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (!this.email || !this.password) {
      this.errorMessage.set(this.t().auth.fillAllFieldsError);
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
        const msg = err.error?.error?.message || this.t().auth.loginGeneralError;
        this.errorMessage.set(msg);
      },
    });
  }

  private redirectIfAlreadyLoggedIn(): boolean {
    if (!this.auth.isAuthenticated() && !this.auth.getAccessToken()) {
      return false;
    }

    this.infoMessage.set(this.t().auth.activeSessionRedirect);
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

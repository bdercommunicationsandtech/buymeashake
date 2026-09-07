import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FirebaseAuthService, SocialProvider } from '../../../core/firebase-auth.service';
import { LanguageService } from '../../../core/language.service';
import { FirebaseNeedsRoleDetails } from '../../../core/api.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly socialLoading = signal<SocialProvider | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  readonly pendingIdToken = signal<string | null>(null);
  readonly needsRoleInfo = signal<FirebaseNeedsRoleDetails | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user && !this.needsRoleInfo()) {
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

  async onSocialLogin(provider: SocialProvider): Promise<void> {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.socialLoading.set(provider);

    try {
      const idToken =
        provider === 'google'
          ? await this.firebaseAuth.signInWithGoogle()
          : await this.firebaseAuth.signInWithApple();
      this.exchangeFirebaseToken(idToken);
    } catch (err) {
      this.socialLoading.set(null);
      this.errorMessage.set(this.mapSocialError(err));
    }
  }

  chooseRole(role: 'athlete' | 'supporter'): void {
    const idToken = this.pendingIdToken();
    if (!idToken) {
      this.clearRolePrompt();
      return;
    }
    this.exchangeFirebaseToken(idToken, role);
  }

  cancelRolePrompt(): void {
    this.clearRolePrompt();
    this.socialLoading.set(null);
  }

  private exchangeFirebaseToken(idToken: string, role?: 'athlete' | 'supporter'): void {
    this.socialLoading.set(this.socialLoading() ?? 'google');
    this.errorMessage.set(null);

    this.auth.loginWithFirebase({ id_token: idToken, role }).subscribe({
      next: () => {
        this.clearRolePrompt();
        this.socialLoading.set(null);
        this.loading.set(false);
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      },
      error: (err) => {
        const needsRole = AuthService.parseNeedsRole(err);
        if (needsRole) {
          this.pendingIdToken.set(idToken);
          this.needsRoleInfo.set(needsRole);
          this.socialLoading.set(null);
          return;
        }

        this.socialLoading.set(null);
        this.errorMessage.set(err.error?.error?.message || this.t().auth.socialLoginError);
      },
    });
  }

  private clearRolePrompt(): void {
    this.pendingIdToken.set(null);
    this.needsRoleInfo.set(null);
  }

  private mapSocialError(err: unknown): string {
    const code = (err as { code?: string; message?: string })?.code
      || (err as { message?: string })?.message;

    if (code === 'FIREBASE_NOT_CONFIGURED') {
      return this.t().auth.socialLoginNotConfigured;
    }
    if (
      code === 'auth/popup-closed-by-user'
      || code === 'auth/cancelled-popup-request'
      || code === 'auth/user-cancelled'
    ) {
      return this.t().auth.socialLoginCancelled;
    }
    return this.t().auth.socialLoginError;
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

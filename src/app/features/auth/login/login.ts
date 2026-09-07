import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FirebaseAuthService, SocialProvider } from '../../../core/firebase-auth.service';
import { LanguageService } from '../../../core/language.service';
import { ThemeService } from '../../../core/theme.service';
import { FirebaseNeedsRoleDetails } from '../../../core/api.models';

type ErrorDescriptor =
  | { type: 'userNotFound' }
  | { type: 'rateLimit'; seconds: number }
  | { type: 'maxAttempts' }
  | { type: 'remainingAttempts'; remaining: number }
  | { type: 'invalidOtp' }
  | { type: 'invalidEmailFormat' }
  | { type: 'noActiveOtp' }
  | { type: 'fillAllFields' }
  | { type: 'loginGeneral' }
  | { type: 'sendOtp' }
  | { type: 'custom'; message: string };

type InfoKey = 'activeOtpNotice' | 'codeResentSuccess' | 'activeSessionRedirect';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly t = this.i18n.t;

  email = '';
  password = '';
  otpCode = '';

  readonly loginMode = signal<'password' | 'otp'>('password');
  readonly otpStep = signal<'email' | 'verify'>('email');
  readonly loading = signal(false);
  readonly socialLoading = signal<SocialProvider | null>(null);
  readonly showPassword = signal(false);
  readonly errorState = signal<ErrorDescriptor | null>(null);
  readonly infoState = signal<InfoKey | null>(null);
  readonly resendCooldown = signal<number>(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly pendingIdToken = signal<string | null>(null);
  readonly needsRoleInfo = signal<FirebaseNeedsRoleDetails | null>(null);

  readonly errorMessage = computed<string | null>(() => {
    const err = this.errorState();
    if (!err) return null;
    const auth = this.t().auth;
    switch (err.type) {
      case 'userNotFound':
        return auth.userNotFound;
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
      case 'noActiveOtp':
        return auth.noActiveOtpError;
      case 'fillAllFields':
        return auth.fillAllFieldsError;
      case 'loginGeneral':
        return auth.loginGeneralError;
      case 'sendOtp':
        return auth.sendOtpError;
      case 'custom':
        return err.message;
    }
  });

  readonly infoMessage = computed<string | null>(() => {
    const info = this.infoState();
    if (!info) return null;
    const auth = this.t().auth;
    switch (info) {
      case 'activeOtpNotice':
        return auth.activeOtpNotice;
      case 'codeResentSuccess':
        return auth.codeResentSuccess;
      case 'activeSessionRedirect':
        return auth.activeSessionRedirect;
    }
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user && !this.needsRoleInfo()) {
        this.infoState.set('activeSessionRedirect');
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  ngOnInit(): void {
    this.restorePendingOtpSession();
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.otpCode = '';
  }

  startResendCooldown(seconds: number = 60): void {
    this.resendCooldown.set(seconds);
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.cooldownInterval = setInterval(() => {
      if (this.resendCooldown() > 0) {
        this.resendCooldown.update((v) => v - 1);
      } else if (this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  setLoginMode(mode: 'password' | 'otp'): void {
    this.loginMode.set(mode);
    this.otpCode = '';
    this.errorState.set(null);
    this.infoState.set(null);
  }

  onSubmit(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (!this.email || !this.password) {
      this.errorState.set({ type: 'fillAllFields' });
      return;
    }

    this.loading.set(true);
    this.errorState.set(null);
    this.infoState.set(null);

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getDefaultRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.setBackendError(err, 'loginGeneral');
      },
    });
  }

  readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email.trim());
  }

  sendLoginOtp(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (!this.email.trim()) return;

    if (!this.isValidEmail(this.email)) {
      this.errorState.set({ type: 'invalidEmailFormat' });
      return;
    }

    if (this.resendCooldown() > 0) {
      this.otpStep.set('verify');
      this.infoState.set('activeOtpNotice');
      this.errorState.set(null);
      this.savePendingOtpSession();
      return;
    }

    this.loading.set(true);
    this.errorState.set(null);
    this.infoState.set(null);

    this.auth.requestOtp({ email: this.email.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpStep.set('verify');
        this.otpCode = '';
        this.startResendCooldown(60);
        this.savePendingOtpSession();
      },
      error: (err) => {
        this.loading.set(false);
        const rawWait = err.error?.error?.details?.wait_seconds;
        const waitSeconds = Math.min(Math.max(1, rawWait || 60), 60);

        if (err.status === 429 || err.error?.error?.code === 'RATE_LIMIT_EXCEEDED') {
          this.startResendCooldown(waitSeconds);
          this.otpStep.set('verify');
          this.errorState.set(null);
          this.infoState.set('activeOtpNotice');
          this.savePendingOtpSession();
          return;
        }

        this.setBackendError(err, 'sendOtp');
      },
    });
  }

  resendLoginOtp(): void {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    if (this.resendCooldown() > 0 || !this.email.trim() || this.loading()) return;

    this.loading.set(true);
    this.errorState.set(null);
    this.infoState.set(null);

    this.auth.requestOtp({ email: this.email.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpCode = '';
        this.startResendCooldown(60);
        this.infoState.set('codeResentSuccess');
        this.savePendingOtpSession();
      },
      error: (err) => {
        this.loading.set(false);
        const rawWait = err.error?.error?.details?.wait_seconds;
        if (rawWait) {
          this.startResendCooldown(Math.min(Math.max(1, rawWait), 60));
        }
        this.setBackendError(err, 'sendOtp');
      },
    });
  }

  goToVerifyStep(): void {
    if (!this.email.trim()) return;

    if (!this.isValidEmail(this.email)) {
      this.errorState.set({ type: 'invalidEmailFormat' });
      return;
    }

    this.loading.set(true);
    this.errorState.set(null);
    this.infoState.set(null);

    this.auth.checkOtpStatus(this.email.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.user_exists === false) {
          this.errorState.set({ type: 'userNotFound' });
          return;
        }

        if (res.has_active_otp) {
          this.otpStep.set('verify');
          this.otpCode = '';
          this.errorState.set(null);
          this.infoState.set('activeOtpNotice');
          if (res.wait_seconds > 0) {
            this.startResendCooldown(res.wait_seconds);
          }
          this.savePendingOtpSession();
        } else {
          this.errorState.set({ type: 'noActiveOtp' });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.setBackendError(err, 'noActiveOtp');
      },
    });
  }

  changeEmail(): void {
    this.otpStep.set('email');
    this.otpCode = '';
    this.errorState.set(null);
    this.infoState.set(null);
    try {
      sessionStorage.removeItem('buymeashake_otp_pending');
    } catch {
      // Ignorar errores de storage
    }
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
    this.errorState.set(null);
    this.infoState.set(null);

    this.auth.verifyOtp({ email: this.email.trim(), code: this.otpCode.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        try {
          sessionStorage.removeItem('buymeashake_otp_pending');
        } catch {
          // Ignorar errores de storage
        }
        this.router.navigate([this.auth.getDefaultRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.otpCode = '';
        this.setBackendError(err, 'invalidOtp');
      },
    });
  }

  async onSocialLogin(provider: SocialProvider): Promise<void> {
    if (this.redirectIfAlreadyLoggedIn()) {
      return;
    }

    this.errorState.set(null);
    this.infoState.set(null);
    this.socialLoading.set(provider);

    try {
      const idToken =
        provider === 'google'
          ? await this.firebaseAuth.signInWithGoogle()
          : await this.firebaseAuth.signInWithApple();
      this.exchangeFirebaseToken(idToken);
    } catch (err) {
      this.socialLoading.set(null);
      this.errorState.set({ type: 'custom', message: this.mapSocialError(err) });
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
    this.errorState.set(null);

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
        this.errorState.set({
          type: 'custom',
          message: err.error?.error?.message || this.t().auth.socialLoginError,
        });
      },
    });
  }

  private clearRolePrompt(): void {
    this.pendingIdToken.set(null);
    this.needsRoleInfo.set(null);
  }

  private mapSocialError(err: unknown): string {
    const code =
      (err as { code?: string; message?: string })?.code
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

  private setBackendError(err: any, fallback: ErrorDescriptor['type'] = 'sendOtp'): void {
    const errorObj = err?.error?.error || err?.error;
    const code = errorObj?.code;
    const details = errorObj?.details || {};

    if (err?.status === 404 || code === 'ENTITY_NOT_FOUND' || details?.entity === 'Usuario') {
      this.errorState.set({ type: 'userNotFound' });
      return;
    }

    if (err?.status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
      const wait = Math.min(Math.max(1, details?.wait_seconds || this.resendCooldown() || 60), 60);
      this.errorState.set({ type: 'rateLimit', seconds: wait });
      return;
    }

    if (code === 'UNAUTHORIZED' || err?.status === 401) {
      if (details?.max_attempts_exceeded) {
        this.errorState.set({ type: 'maxAttempts' });
        return;
      }
      if (details?.remaining_attempts !== undefined) {
        this.errorState.set({ type: 'remainingAttempts', remaining: details.remaining_attempts });
        return;
      }
      this.errorState.set({ type: 'invalidOtp' });
      return;
    }

    if (fallback === 'loginGeneral') {
      this.errorState.set({ type: 'loginGeneral' });
    } else if (fallback === 'noActiveOtp') {
      this.errorState.set({ type: 'noActiveOtp' });
    } else if (fallback === 'invalidOtp') {
      this.errorState.set({ type: 'invalidOtp' });
    } else {
      this.errorState.set({ type: 'sendOtp' });
    }
  }

  private savePendingOtpSession(): void {
    try {
      sessionStorage.setItem('buymeashake_otp_pending', JSON.stringify({
        email: this.email.trim(),
        timestamp: Date.now(),
        cooldownEnd: Date.now() + (this.resendCooldown() * 1000),
      }));
    } catch {
      // Ignorar errores de storage
    }
  }

  private restorePendingOtpSession(): void {
    try {
      const raw = sessionStorage.getItem('buymeashake_otp_pending');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.email) return;

      const elapsedMs = Date.now() - (data.timestamp || 0);
      if (elapsedMs < 15 * 60 * 1000) {
        this.email = data.email;
        this.loginMode.set('otp');
        this.otpStep.set('verify');

        const remainingSec = Math.ceil(((data.cooldownEnd || 0) - Date.now()) / 1000);
        if (remainingSec > 0) {
          this.startResendCooldown(Math.min(remainingSec, 60));
        }
      } else {
        sessionStorage.removeItem('buymeashake_otp_pending');
      }
    } catch {
      sessionStorage.removeItem('buymeashake_otp_pending');
    }
  }

  private redirectIfAlreadyLoggedIn(): boolean {
    if (!this.auth.isAuthenticated() && !this.auth.getAccessToken()) {
      return false;
    }

    this.infoState.set('activeSessionRedirect');
    this.errorState.set(null);

    if (this.auth.currentUser()) {
      void this.router.navigateByUrl(this.auth.getDefaultRoute());
      return true;
    }

    this.auth.loadMe().subscribe({
      next: () => this.router.navigateByUrl(this.auth.getDefaultRoute()),
      error: () => {
        this.infoState.set(null);
        this.auth.clearSession(false);
      },
    });
    return true;
  }
}

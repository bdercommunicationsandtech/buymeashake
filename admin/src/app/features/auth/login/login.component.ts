import { Component, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../core/config/environment';
import { AuthService } from '../../../core/services/auth.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 256;

function extractErrorMessage(err: unknown): string {
  const e = err as {
    error?: { detail?: unknown; error?: { message?: string }; message?: string };
    message?: string;
  };
  const detail = e?.error?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(String).join(' ');
  const nested = e?.error?.error?.message;
  if (typeof nested === 'string') return nested;
  if (typeof e?.error?.message === 'string') return e.error.message;
  return e?.message || 'Error al iniciar sesión';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, LoadingComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly emailMaxLength = EMAIL_MAX_LENGTH;
  readonly passwordMaxLength = PASSWORD_MAX_LENGTH;

  loading = signal(false);
  errorMessage = signal('');

  widgetId: string | null = null;
  turnstileToken: string | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
    password: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(PASSWORD_MAX_LENGTH)],
    ],
  });

  ngAfterViewInit(): void {
    this.renderTurnstile();
  }

  ngOnDestroy(): void {
    this.resetTurnstile();
  }

  private renderTurnstile(): void {
    const siteKey = environment.cloudflareTurnstileSiteKey;
    if (!siteKey) return;

    const checkAndRender = (): boolean => {
      const turnstileObj = (window as any).turnstile;
      if (turnstileObj) {
        try {
          this.widgetId = turnstileObj.render('#turnstile-container', {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              this.turnstileToken = token;
              this.errorMessage.set('');
            },
            'expired-callback': () => {
              this.turnstileToken = null;
            },
            'error-callback': () => {
              this.turnstileToken = null;
            },
          });
          return true;
        } catch {
          return true;
        }
      }
      return false;
    };

    if (!checkAndRender()) {
      const start = Date.now();
      const interval = setInterval(() => {
        if (checkAndRender() || Date.now() - start > 5000) {
          clearInterval(interval);
        }
      }, 100);
    }
  }

  private resetTurnstile(): void {
    const turnstileObj = (window as any).turnstile;
    if (turnstileObj && this.widgetId) {
      try {
        turnstileObj.remove(this.widgetId);
      } catch {}
    }
  }

  onSubmit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const email = (raw.email ?? '').trim().toLowerCase();
    const password = raw.password;

    if (environment.cloudflareTurnstileSiteKey && !this.turnstileToken) {
      this.errorMessage.set('Por favor, completa la verificación de seguridad CAPTCHA.');
      return;
    }

    this.loading.set(true);
    this.auth
      .login({
        email,
        password,
        cf_turnstile_token: this.turnstileToken || undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractErrorMessage(err));
          const turnstileObj = (window as any).turnstile;
          if (turnstileObj && this.widgetId) {
            try {
              turnstileObj.reset(this.widgetId);
            } catch {}
            this.turnstileToken = null;
          }
        },
      });
  }
}

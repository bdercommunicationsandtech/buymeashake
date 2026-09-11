import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LookupService } from '../../../core/lookup.service';
import { LookupItemDto } from '../../../core/api.models';
import { AllowedUserTextDirective } from '../../../core/directives/allowed-user-text.directive';
import { LanguageService } from '../../../core/language.service';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../../../shared/chrome-controls/chrome-controls.component';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { evaluatePassword } from '../../../core/utils/password-validator.util';

type RegisterRole = 'athlete' | 'supporter';

type RegisterError =
  | { type: 'fillAllFields' }
  | { type: 'passwordMinLength' }
  | { type: 'passwordRequirements' }
  | { type: 'blacklisted' }
  | { type: 'suspended' }
  | { type: 'general' }
  | { type: 'custom'; message: string };

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AllowedUserTextDirective,
    BrandLogoComponent,
    ChromeControlsComponent,
    PasswordStrengthComponent,
  ],
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly lookupService = inject(LookupService);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;
  readonly lang = this.i18n.lang;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user) {
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  readonly role = signal<RegisterRole>('athlete');
  readonly isAthlete = computed(() => this.role() === 'athlete');

  readonly handle = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly disciplineIds = signal<number[]>([]);
  readonly dropdownOpen = signal<boolean>(false);
  readonly searchSport = signal('');
  readonly sports = signal<LookupItemDto[]>([]);
  readonly loading = signal(false);
  readonly errorState = signal<RegisterError | null>(null);

  readonly filteredSports = computed(() => {
    const q = this.searchSport().trim().toLowerCase();
    const list = this.sports();
    if (!q) return list;
    return list.filter((s) => this.i18n.translateDiscipline(s.label).toLowerCase().includes(q));
  });

  readonly errorMessage = computed(() => {
    const err = this.errorState();
    if (!err) return null;
    const auth = this.t().auth;
    switch (err.type) {
      case 'fillAllFields':
        return auth.fillAllFieldsError;
      case 'passwordMinLength':
        return auth.passwordMinLengthError;
      case 'passwordRequirements':
        return auth.passwordRequirementsError;
      case 'blacklisted':
        return auth.blacklistedEmailError;
      case 'suspended':
        return auth.accountSuspendedIndefiniteError;
      case 'custom':
        return err.message;
      default:
        return auth.registerGeneralError;
    }
  });

  ngOnInit(): void {
    const roleParam = (this.route.snapshot.queryParamMap.get('role') || '').toLowerCase();
    this.role.set(roleParam === 'supporter' ? 'supporter' : 'athlete');

    this.route.queryParamMap.subscribe((params) => {
      const next = (params.get('role') || '').toLowerCase();
      this.role.set(next === 'supporter' ? 'supporter' : 'athlete');
    });

    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        this.sports.set(items || []);
        if (this.isAthlete() && items.length > 0 && this.disciplineIds().length === 0) {
          this.disciplineIds.set([items[0].id]);
        }
      },
      error: () => this.sports.set([]),
    });
  }

  onHandleInput(value: string): void {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30);
    this.handle.set(cleaned);
  }

  toggleSport(id: number): void {
    const current = this.disciplineIds();
    if (current.includes(id)) {
      this.disciplineIds.set(current.filter((x) => x !== id));
      return;
    }
    this.disciplineIds.set([...current, id]);
  }

  getDisciplineLabel(id: number): string {
    const found = this.sports().find((s) => s.id === id);
    return found ? this.i18n.translateDiscipline(found.label) : String(id);
  }

  submit(): void {
    const isAthlete = this.isAthlete();
    if (!this.email() || !this.password() || !this.name() || (isAthlete && !this.handle())) {
      this.errorState.set({ type: 'fillAllFields' });
      return;
    }

    if (this.password().length < 8) {
      this.errorState.set({ type: 'passwordMinLength' });
      return;
    }

    if (!evaluatePassword(this.password()).isValid) {
      this.errorState.set({ type: 'passwordRequirements' });
      return;
    }

    this.loading.set(true);
    this.errorState.set(null);

    this.auth
      .register({
        email: this.email(),
        password: this.password(),
        full_name: this.name(),
        role: this.role(),
        handle: isAthlete ? this.handle() : undefined,
        discipline_ids: isAthlete ? this.disciplineIds() : undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigateByUrl(isAthlete ? '/onboarding' : '/supporter/home');
        },
        error: (err) => {
          this.loading.set(false);
          const errorObj = err?.error?.error || err?.error;
          const code = errorObj?.code;
          const details = errorObj?.details || {};
          const msg = String(errorObj?.message || '');

          if (err?.status === 403 || code === 'FORBIDDEN') {
            if (
              details?.reason_code === 'ACCOUNT_SUSPENDED' ||
              msg.toLowerCase().includes('suspendida') ||
              msg.toLowerCase().includes('suspended')
            ) {
              this.errorState.set({ type: 'suspended' });
              return;
            }
            this.errorState.set({ type: 'blacklisted' });
            return;
          }

          if (msg) {
            this.errorState.set({ type: 'custom', message: msg });
          } else {
            this.errorState.set({ type: 'general' });
          }
        },
      });
  }
}

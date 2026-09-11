import { Component, effect, inject, OnInit, signal , computed} from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LookupService } from '../../../core/lookup.service';
import { LookupItemDto } from '../../../core/api.models';
import { AllowedUserTextDirective } from '../../../core/directives/allowed-user-text.directive';
import { LanguageService } from '../../../core/language.service';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../../../shared/chrome-controls/chrome-controls.component';

type RegisterError =
  | { type: 'fillAllFields' }
  | { type: 'passwordMinLength' }
  | { type: 'blacklisted' }
  | { type: 'suspended' }
  | { type: 'general' }
  | { type: 'custom'; message: string };

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AllowedUserTextDirective, BrandLogoComponent, ChromeControlsComponent],
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
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

  readonly handle = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly disciplineIds = signal<number[]>([]);
  readonly dropdownOpen = signal<boolean>(false);
  readonly searchSport = signal('');
  readonly filteredSports = computed(() => {
    const q = this.searchSport().toLowerCase().trim();
    const all = this.sports();
    if (!q) return all;
    // use this.i18n or this.languageService
    const svc = (this as any).i18n || (this as any).languageService;
    return all.filter((s) => svc.translateDiscipline(s.label).toLowerCase().includes(q));
  });

  readonly loading = signal(false);
  readonly errorState = signal<RegisterError | null>(null);
  readonly errorMessage = computed<string | null>(() => {
    const err = this.errorState();
    if (!err) return null;
    const auth = this.t().auth;
    switch (err.type) {
      case 'fillAllFields':
        return auth.fillAllFieldsError;
      case 'passwordMinLength':
        return auth.passwordMinLengthError;
      case 'blacklisted':
        return auth.blacklistedEmailError;
      case 'suspended':
        return auth.accountSuspendedIndefiniteError;
      case 'general':
        return auth.registerGeneralError;
      case 'custom':
        return err.message;
    }
  });

  readonly sports = signal<LookupItemDto[]>([]);

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        this.sports.set(items);
        if (items.length > 0) {
          this.disciplineIds.set([items[0].id]);
        }
      },
      error: () => {},
    });
  }

  onHandleInput(val: string): void {
    this.handle.set(val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30));
  }


  toggleSport(id: number): void {
    const current = this.disciplineIds();
    if (current.includes(id)) {
      this.disciplineIds.set(current.filter((c) => c !== id));
    } else {
      this.disciplineIds.set([...current, id]);
    }
  }

  getDisciplineLabel(id: number): string {
    const sport = this.sports().find((s) => s.id === id);
    return sport ? this.i18n.translateDiscipline(sport.label) : '';
  }

  submit(): void {
    if (!this.email() || !this.password() || !this.name() || !this.handle()) {
      this.errorState.set({ type: 'fillAllFields' });
      return;
    }

    if (this.password().length < 8) {
      this.errorState.set({ type: 'passwordMinLength' });
      return;
    }

    this.loading.set(true);
    this.errorState.set(null);

    this.auth
      .register({
        email: this.email(),
        password: this.password(),
        full_name: this.name(),
        role: 'athlete',
        handle: this.handle(),
        discipline_ids: this.disciplineIds(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/onboarding']);
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

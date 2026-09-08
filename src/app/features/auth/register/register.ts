import { Component, effect, inject, OnInit, signal , computed} from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LookupService } from '../../../core/lookup.service';
import { LookupItemDto } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lookupService = inject(LookupService);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;

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
  readonly disciplineCodes = signal<number[]>([]);
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
  readonly errorMessage = signal<string | null>(null);

  readonly sports = signal<LookupItemDto[]>([]);

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        this.sports.set(items);
        if (items.length > 0) {
          this.disciplineCodes.set([items[0].code]);
        }
      },
      error: () => {},
    });
  }

  onHandleInput(val: string): void {
    this.handle.set(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }


  toggleSport(code: number): void {
    const current = this.disciplineCodes();
    if (current.includes(code)) {
      this.disciplineCodes.set(current.filter((c) => c !== code));
    } else {
      this.disciplineCodes.set([...current, code]);
    }
  }

  getDisciplineLabel(code: number): string {
    const sport = this.sports().find((s) => s.code === code);
    return sport ? this.i18n.translateDiscipline(sport.label) : '';
  }

  submit(): void {
    if (!this.email() || !this.password() || !this.name() || !this.handle()) {
      this.errorMessage.set(this.t().auth.fillAllFieldsError);
      return;
    }

    if (this.password().length < 8) {
      this.errorMessage.set(this.t().auth.passwordMinLengthError);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth
      .register({
        email: this.email(),
        password: this.password(),
        full_name: this.name(),
        role: 'athlete',
        handle: this.handle(),
        discipline_codes: this.disciplineCodes(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/onboarding']);
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err.error?.error?.message ||
            this.t().auth.registerGeneralError;
          this.errorMessage.set(msg);
        },
      });
  }
}

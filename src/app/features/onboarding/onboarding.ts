import { Component, inject, OnInit, signal , computed} from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DashboardService } from '../../core/dashboard.service';
import { LookupService } from '../../core/lookup.service';
import { LookupItemDto } from '../../core/api.models';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly lookupService = inject(LookupService);
  private readonly router = inject(Router);
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly isSupporter = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly fullName = signal('');
  readonly bio = signal('');
  readonly city = signal('');
  readonly handle = signal('');
  readonly disciplineCodes = signal<number[]>([]);
  readonly dropdownOpen = signal(false);
  readonly searchSport = signal('');
  readonly filteredSports = computed(() => {
    const q = this.searchSport().toLowerCase().trim();
    const all = this.sports();
    if (!q) return all;
    return all.filter((s) =>
      this.languageService.translateDiscipline(s.label).toLowerCase().includes(q)
    );
  });
  readonly shakePrice = signal(3);
  readonly sports = signal<LookupItemDto[]>([]);

  toggleSport(code: number): void {
    const current = this.disciplineCodes();
    if (current.includes(code)) {
      this.disciplineCodes.set(current.filter((c: number) => c !== code));
    } else {
      this.disciplineCodes.set([...current, code]);
    }
  }

  getDisciplineLabel(code: number): string {
    const sport = this.sports().find((s) => s.code === code);
    return sport ? this.languageService.translateDiscipline(sport.label) : '';
  }

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => this.sports.set(items),
      error: () => {},
    });

    const user = this.authService.currentUser();
    if (user?.role === 'supporter' || !user?.athlete_handle) {
      this.isSupporter.set(true);
      if (user) {
        this.fullName.set(user.full_name || '');
        // Generar un handle sugerido a partir de su nombre o email
        const baseHandle = (user.full_name || user.email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);
        this.handle.set(baseHandle);
      }
      this.loading.set(false);
      return;
    }

    this.dashboardService.getProfile().subscribe({
      next: (p) => {
        this.fullName.set(p.full_name);
        this.bio.set(p.bio || '');
        this.city.set(p.city || '');
        this.handle.set(p.handle);
        this.disciplineCodes.set(p.discipline_codes || []);
        this.shakePrice.set(Number(p.shake_price) || 3);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveAndContinue(): void {
    const rawHandle = this.handle().trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!rawHandle || rawHandle.length < 3) {
      this.errorMessage.set('El @handle debe tener al menos 3 caracteres alfanuméricos.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    if (this.isSupporter()) {
      this.authService
        .upgradeToAthlete({
          handle: rawHandle,
          full_name: this.fullName().trim(),
          bio: this.bio().trim() || undefined,
          city: this.city().trim() || undefined,
          discipline_codes: this.disciplineCodes(),
          shake_price: this.shakePrice(),
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/dashboard/payouts']);
          },
          error: (err) => {
            this.saving.set(false);
            const detail = err?.error?.detail || 'No se pudo crear tu página de atleta. Verifica el @handle.';
            this.errorMessage.set(detail);
          },
        });
      return;
    }

    this.dashboardService
      .updateProfile({
        full_name: this.fullName(),
        bio: this.bio(),
        city: this.city(),
        discipline_codes: this.disciplineCodes(),
        shake_price: this.shakePrice(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dashboard/payouts']);
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.t().onboarding.errorMessage);
        },
      });
  }
}

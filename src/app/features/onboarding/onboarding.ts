import { Component, inject, OnInit, signal } from '@angular/core';
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
  readonly primarySportCode = signal(101);
  readonly shakePrice = signal(3);
  readonly sports = signal<LookupItemDto[]>([]);

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
        this.primarySportCode.set(p.primary_sport_code || 101);
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
          primary_sport_code: this.primarySportCode(),
          shake_price: this.shakePrice(),
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/dashboard/home']);
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
        primary_sport_code: this.primarySportCode(),
        shake_price: this.shakePrice(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dashboard/home']);
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.t().onboarding.errorMessage);
        },
      });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../core/dashboard.service';
import { LookupService } from '../../core/lookup.service';
import { LookupItemDto } from '../../core/api.models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly lookupService = inject(LookupService);
  private readonly router = inject(Router);

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
    this.saving.set(true);
    this.errorMessage.set(null);

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
          this.errorMessage.set('No se pudo guardar el perfil. Intenta de nuevo.');
        },
      });
  }
}

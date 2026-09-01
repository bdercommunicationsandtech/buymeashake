import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/dashboard.service';
import { LookupService } from '../../../core/lookup.service';
import { AthleteProfileFull, LookupItemDto } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
})
export class DashboardSettings implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly lookupService = inject(LookupService);

  readonly Math = Math;

  readonly activeTab = signal<'settings' | 'profile' | 'goals' | 'notifications'>('profile');
  readonly loading = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly uploadingCover = signal(false);
  readonly saved = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Perfil & Ajustes
  readonly fullName = signal('');
  readonly bio = signal('');
  readonly city = signal('');
  readonly primarySportCode = signal<number>(101);
  readonly shakePrice = signal<number>(3);
  readonly currency = signal<'USD' | 'MXN'>('USD');
  readonly pageHandle = signal('');
  readonly avatarUrl = signal<string | null>(null);
  readonly coverImageUrl = signal<string | null>(null);
  readonly analyticsCode = signal('');

  // Metas
  readonly goalTitle = signal('');
  readonly goalTarget = signal<number>(1000);
  readonly activeGoal = signal<{ title: string; target: number; raised: number } | null>(null);
  readonly goalSaved = signal(false);

  readonly sports = signal<LookupItemDto[]>([]);

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => this.sports.set(items),
      error: () => {},
    });
    this.loadProfile();
    this.loadGoals();
  }

  loadProfile(): void {
    this.dashboardService.getProfile().subscribe({
      next: (p: AthleteProfileFull) => {
        this.fullName.set(p.full_name);
        this.bio.set(p.bio || '');
        this.city.set(p.city || '');
        this.primarySportCode.set(p.primary_sport_code || 101);
        this.shakePrice.set(Number(p.shake_price) || 3);
        this.currency.set((p.currency as 'USD' | 'MXN') || 'USD');
        this.pageHandle.set(p.handle);
        this.avatarUrl.set(p.avatar_url);
        this.coverImageUrl.set(p.cover_image_url);
      },
      error: () => {},
    });
  }

  loadGoals(): void {
    this.dashboardService.getGoals().subscribe({
      next: (goals) => {
        const active = goals.find((g) => g.is_active);
        if (active) {
          this.activeGoal.set({
            title: active.title,
            target: Number(active.target_amount),
            raised: Number(active.raised_amount),
          });
          this.goalTitle.set(active.title);
          this.goalTarget.set(Number(active.target_amount));
        }
      },
      error: () => {},
    });
  }

  setTab(tab: 'settings' | 'profile' | 'goals' | 'notifications'): void {
    this.activeTab.set(tab);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingAvatar.set(true);

    this.dashboardService.uploadImage(file).subscribe({
      next: (res) => {
        this.uploadingAvatar.set(false);
        this.avatarUrl.set(res.url);
        // Guardar automáticamente
        this.saveProfile();
      },
      error: () => {
        this.uploadingAvatar.set(false);
        this.errorMessage.set('Error al subir imagen de avatar.');
      },
    });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingCover.set(true);

    this.dashboardService.uploadImage(file).subscribe({
      next: (res) => {
        this.uploadingCover.set(false);
        this.coverImageUrl.set(res.url);
        this.saveProfile();
      },
      error: () => {
        this.uploadingCover.set(false);
        this.errorMessage.set('Error al subir imagen de portada.');
      },
    });
  }

  saveProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.updateProfile({
      full_name: this.fullName(),
      bio: this.bio(),
      city: this.city(),
      primary_sport_code: this.primarySportCode(),
      shake_price: this.shakePrice(),
      currency: this.currency(),
      avatar_url: this.avatarUrl() || undefined,
      cover_image_url: this.coverImageUrl() || undefined,
      google_analytics_id: this.analyticsCode() || undefined,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.error?.message || 'Error al guardar cambios.';
        this.errorMessage.set(msg);
      },
    });
  }

  saveGoal(): void {
    if (!this.goalTitle() || this.goalTarget() <= 0) return;

    this.dashboardService.createGoal({
      title: this.goalTitle(),
      target_amount: this.goalTarget(),
      currency: this.currency(),
    }).subscribe({
      next: (g) => {
        this.activeGoal.set({
          title: g.title,
          target: Number(g.target_amount),
          raised: Number(g.raised_amount),
        });
        this.goalSaved.set(true);
        setTimeout(() => this.goalSaved.set(false), 2500);
      },
      error: () => {},
    });
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardService } from '../../../core/dashboard.service';
import { AthleteProfileFull, DashboardMetrics } from '../../../core/api.models';
import { ShareQrModalComponent } from '../../../shared/share-qr-modal/share-qr-modal.component';
import { LanguageService } from '../../../core/language.service';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ShareQrModalComponent,
    MediaUrlPipe,
  ],
  templateUrl: './home.html',
})
export class DashboardHome implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly profile = signal<AthleteProfileFull | null>(null);
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly loading = signal(true);

  readonly selectedPeriod = signal('30d');
  
  readonly timeRange = computed(() => {
    const p = this.selectedPeriod();
    if (p === '7d') return 'Last 7 days';
    if (p === '30d') return 'Last 30 days';
    if (p === '90d') return 'Last 90 days';
    if (p === 'all_time') return 'All Time';
    return this.t().dashboard.last30Days;
  });

  onPeriodChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedPeriod.set(value);
    this.loadData();
  }

  readonly shareModalOpen = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Cargar perfil del atleta
    this.dashboardService.getProfile().subscribe({
      next: (prof) => {
        this.profile.set(prof);
      },
      error: () => {},
    });

    // Cargar métricas financieras de 30 días
    this.dashboardService.getMetrics(this.selectedPeriod()).subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openShareModal(): void {
    this.shareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.shareModalOpen.set(false);
  }
}

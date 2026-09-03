import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardService } from '../../../core/dashboard.service';
import { AthleteProfileFull, DashboardMetrics } from '../../../core/api.models';
import { ShareQrModalComponent } from '../../../shared/share-qr-modal/share-qr-modal.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ShareQrModalComponent,
  ],
  templateUrl: './home.html',
})
export class DashboardHome implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly profile = signal<AthleteProfileFull | null>(null);
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly loading = signal(true);

  readonly timeRange = signal('Últimos 30 días');
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
    this.dashboardService.getMetrics().subscribe({
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

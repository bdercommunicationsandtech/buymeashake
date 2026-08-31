import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardService } from '../../../core/dashboard.service';
import { AthleteProfileFull, DashboardMetrics } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
})
export class DashboardHome implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly profile = signal<AthleteProfileFull | null>(null);
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly loading = signal(true);

  readonly timeRange = signal('Últimos 30 días');
  readonly shareCopied = signal(false);

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

  copyShare(): void {
    const handle = this.profile()?.handle || 'sofifit';
    const url = `https://buymeashake.fit/${handle}`;
    navigator.clipboard?.writeText(url);
    this.shareCopied.set(true);
    setTimeout(() => this.shareCopied.set(false), 2500);
  }
}

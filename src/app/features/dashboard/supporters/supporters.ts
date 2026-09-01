import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/dashboard.service';
import { SupporterItemDto } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-supporters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supporters.html',
})
export class DashboardSupporters implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly activeTab = signal<'one-time' | 'settings'>('one-time');
  readonly supporterCount = signal(0);
  readonly last30Days = signal(0);
  readonly allTime = signal(0);
  readonly currency = signal('USD');
  readonly items = signal<SupporterItemDto[]>([]);

  readonly shakePrice = signal(3);
  readonly thankMessage = signal(
    '¡Muchas gracias por invitarme un shake! Me ayuda a seguir entrenando y creando contenido.',
  );
  readonly savingSettings = signal(false);

  ngOnInit(): void {
    this.dashboardService.getSupporters().subscribe({
      next: (res) => {
        this.supporterCount.set(res.supporter_count);
        this.last30Days.set(res.last_30_days_total);
        this.allTime.set(res.all_time_total);
        this.currency.set(res.currency);
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.dashboardService.getProfile().subscribe({
      next: (p) => {
        this.shakePrice.set(Number(p.shake_price) || 3);
      },
      error: () => {},
    });
  }

  setTab(tab: 'one-time' | 'settings'): void {
    this.activeTab.set(tab);
  }

  saveSettings(): void {
    this.savingSettings.set(true);
    this.dashboardService
      .updateProfile({
        shake_price: this.shakePrice(),
      })
      .subscribe({
        next: () => this.savingSettings.set(false),
        error: () => this.savingSettings.set(false),
      });
  }
}

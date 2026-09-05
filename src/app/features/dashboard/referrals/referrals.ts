import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconShakerComponent } from '../../../shared/icons';
import { DashboardService } from '../../../core/dashboard.service';
import { ReferralDashboardData } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-dashboard-referrals',
  standalone: true,
  imports: [CommonModule, IconShakerComponent],
  templateUrl: './referrals.html',
})
export class DashboardReferrals implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly loading = signal(true);
  readonly copied = signal(false);
  readonly data = signal<ReferralDashboardData | null>(null);

  ngOnInit(): void {
    this.dashboardService.getReferrals().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  copyLink(): void {
    const link = this.data()?.referral_link;
    if (!link) return;
    navigator.clipboard?.writeText(link);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}

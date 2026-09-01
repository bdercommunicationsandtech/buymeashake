import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/dashboard.service';
import { MembershipTierItem } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-memberships',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memberships.html',
})
export class DashboardMemberships implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showCreateModal = signal(false);
  readonly tiers = signal<MembershipTierItem[]>([]);

  readonly newName = signal('');
  readonly newDescription = signal('');
  readonly newPrice = signal(10);
  readonly newCurrency = signal('USD');
  readonly newBenefitsText = signal('');

  readonly totalMembers = computed(() =>
    this.tiers().reduce((sum, t) => sum + t.members_count, 0),
  );

  readonly monthlyRecurring = computed(() =>
    this.tiers().reduce((sum, t) => sum + t.monthly_price * t.members_count, 0),
  );

  readonly popularTier = computed(() => {
    const list = this.tiers();
    if (!list.length) return null;
    return list.reduce((best, t) => (t.members_count > best.members_count ? t : best), list[0]);
  });

  readonly featuredTierId = computed(() => this.popularTier()?.id ?? null);

  ngOnInit(): void {
    this.loadTiers();
  }

  loadTiers(): void {
    this.dashboardService.getMembershipTiers().subscribe({
      next: (items) => {
        this.tiers.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveTier(): void {
    const benefits = this.newBenefitsText()
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    if (!this.newName() || this.newPrice() <= 0) return;

    this.saving.set(true);
    this.dashboardService
      .createMembershipTier({
        name: this.newName(),
        description: this.newDescription() || undefined,
        monthly_price: this.newPrice(),
        currency: this.newCurrency(),
        benefits,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.newName.set('');
          this.newDescription.set('');
          this.newPrice.set(10);
          this.newBenefitsText.set('');
          this.closeCreateModal();
          this.loadTiers();
        },
        error: () => this.saving.set(false),
      });
  }
}

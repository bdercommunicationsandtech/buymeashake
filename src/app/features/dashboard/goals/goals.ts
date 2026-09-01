import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/dashboard.service';
import { GoalItem } from '../../../core/api.models';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './goals.html',
})
export class DashboardGoals implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly goals = signal<GoalItem[]>([]);
  readonly goalTitle = signal('');
  readonly goalTarget = signal(1000);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.dashboardService.getGoals().subscribe({
      next: (items) => {
        this.goals.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  createGoal(): void {
    if (!this.goalTitle() || this.goalTarget() <= 0) return;

    this.saving.set(true);
    this.dashboardService
      .createGoal({
        title: this.goalTitle(),
        target_amount: this.goalTarget(),
        currency: 'USD',
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.goalTitle.set('');
          this.loadGoals();
        },
        error: () => this.saving.set(false),
      });
  }
}

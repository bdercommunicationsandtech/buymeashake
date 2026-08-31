import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-supporters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supporters.html',
})
export class DashboardSupporters {
  readonly activeTab = signal<'one-time' | 'settings'>('one-time');
  readonly supporterCount = signal(0);
  readonly last30Days = signal(0);
  readonly allTime = signal(0);

  setTab(tab: 'one-time' | 'settings'): void {
    this.activeTab.set(tab);
  }
}

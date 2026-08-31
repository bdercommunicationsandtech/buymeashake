import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
})
export class DashboardSettings {
  readonly activeTab = signal<'settings' | 'notifications'>('settings');
  readonly currency = signal('United States Dollar (USD)');
  readonly coverFee = signal(true);
  readonly nsfw = signal(false);
  readonly analyticsCode = signal('');
  readonly pageHandle = signal('sofifit');

  readonly saved = signal(false);

  setTab(tab: 'settings' | 'notifications'): void {
    this.activeTab.set(tab);
  }

  toggleCoverFee(): void {
    this.coverFee.update((v) => !v);
  }

  toggleNsfw(): void {
    this.nsfw.update((v) => !v);
  }

  save(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}

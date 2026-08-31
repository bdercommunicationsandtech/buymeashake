import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
})
export class DashboardHome {
  readonly timeRange = signal('Last 30 days');
  readonly earnings = signal(0);
  readonly supportersEarnings = signal(0);
  readonly membershipEarnings = signal(0);
  readonly shopEarnings = signal(0);

  readonly shareCopied = signal(false);

  copyShare(): void {
    navigator.clipboard?.writeText('https://buymeashake.com/sofifit');
    this.shareCopied.set(true);
    this.timeRange.set('Last 30 days');
  }
}

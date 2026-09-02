import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-payouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payouts.html',
})
export class DashboardPayouts {
  readonly stripeConnected = signal(false);
  readonly selectedCountry = signal('Estados Unidos');
  readonly selectedCurrency = signal('USD');
  readonly availableBalance = signal(0);
  readonly pendingBalance = signal(0);

  connectStripe(): void {
    this.stripeConnected.set(true);
  }
}

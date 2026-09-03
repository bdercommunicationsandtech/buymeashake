import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../core/payment.service';

@Component({
  selector: 'app-dashboard-payouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payouts.html',
})
export class DashboardPayouts implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly stripeConnected = signal(false);
  readonly detailsSubmitted = signal(false);
  readonly loading = signal(true);
  readonly connecting = signal(false);
  readonly selectedCountry = signal('México');
  readonly selectedCurrency = signal('USD');
  readonly availableBalance = signal(0);
  readonly pendingBalance = signal(0);
  readonly requirementsDue = signal<string[]>([]);

  ngOnInit(): void {
    this.checkConnectStatus();
  }

  checkConnectStatus(): void {
    this.loading.set(true);
    this.paymentService.getStripeConnectStatus().subscribe({
      next: (status) => {
        this.stripeConnected.set(status.payouts_enabled);
        this.detailsSubmitted.set(status.details_submitted);
        this.requirementsDue.set(status.requirements_due || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  connectStripe(): void {
    this.connecting.set(true);
    this.paymentService.getStripeConnectLink().subscribe({
      next: (res) => {
        if (res.account_link_url) {
          // Redirección hacia Stripe Express Onboarding
          window.location.href = res.account_link_url;
        } else {
          this.connecting.set(false);
        }
      },
      error: () => {
        this.connecting.set(false);
      },
    });
  }
}


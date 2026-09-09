import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/payment.service';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-dashboard-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payouts.html',
})
export class DashboardPayouts implements OnInit {
  private readonly paymentService = inject(PaymentService);
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly stripeConnected = signal(false);
  readonly chargesEnabled = signal(false);
  readonly detailsSubmitted = signal(false);
  readonly loading = signal(true);
  readonly connecting = signal(false);
  readonly openingPortal = signal(false);
  readonly selectedCountry = signal<'MX' | 'US'>('MX');

  readonly totalEarned = signal(0);
  readonly availableBalance = signal(0);

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loading.set(true);
    this.checkConnectStatus();
    this.loadBalance();
  }

  checkConnectStatus(): void {
    this.paymentService.getStripeConnectStatus().subscribe({
      next: (status) => {
        this.stripeConnected.set(Boolean(status.stripe_connect_account_id));
        this.chargesEnabled.set(status.charges_enabled);
        this.detailsSubmitted.set(status.details_submitted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadBalance(): void {
    this.paymentService.getAthleteBalance().subscribe({
      next: (res) => {
        this.totalEarned.set(Number(res.total_earned) || 0);
        this.availableBalance.set(Number(res.available_balance) || 0);
        if (res.destination_country === 'US' || res.destination_country === 'MX') {
          this.selectedCountry.set(res.destination_country);
        }
        if (typeof res.charges_enabled === 'boolean') {
          this.chargesEnabled.set(res.charges_enabled);
        }
      },
      error: (err) => console.error('Error cargando balance:', err),
    });
  }

  connectStripe(): void {
    this.connecting.set(true);
    this.paymentService.getStripeConnectLink(this.selectedCountry()).subscribe({
      next: (res) => {
        if (res.account_link_url) {
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

  openExpressPortal(): void {
    this.openingPortal.set(true);
    this.paymentService.getExpressPortalUrl().subscribe({
      next: (res) => {
        if (res.redirect_url) {
          window.location.href = res.redirect_url;
        } else {
          this.openingPortal.set(false);
        }
      },
      error: () => {
        this.openingPortal.set(false);
      },
    });
  }
}

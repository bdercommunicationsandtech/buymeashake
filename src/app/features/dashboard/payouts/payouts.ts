import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/payment.service';

interface WithdrawalItem {
  id: number;
  amount_usd: number;
  currency: string;
  destination_country: string;
  status: string;
  stripe_transfer_id?: string;
  failure_reason?: string;
  requested_at: string;
  processed_at?: string;
}

@Component({
  selector: 'app-dashboard-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payouts.html',
})
export class DashboardPayouts implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly stripeConnected = signal(false);
  readonly detailsSubmitted = signal(false);
  readonly loading = signal(true);
  readonly connecting = signal(false);
  readonly selectedCountry = signal<'MX' | 'US'>('MX');
  readonly selectedCurrency = signal('USD');

  // Balance BDER
  readonly totalEarned = signal(0);
  readonly totalWithdrawn = signal(0);
  readonly availableBalance = signal(0);
  readonly pendingWithdrawalAmount = signal(0);

  // Retiros
  readonly withdrawals = signal<WithdrawalItem[]>([]);
  readonly showWithdrawModal = signal(false);
  readonly withdrawAmount = signal<number | null>(null);
  readonly requestingWithdrawal = signal(false);
  readonly withdrawError = signal<string | null>(null);
  readonly withdrawSuccess = signal<string | null>(null);

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loading.set(true);
    this.checkConnectStatus();
    this.loadBalance();
    this.loadWithdrawals();
  }

  checkConnectStatus(): void {
    this.paymentService.getStripeConnectStatus().subscribe({
      next: (status) => {
        this.stripeConnected.set(status.payouts_enabled);
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
        this.totalWithdrawn.set(Number(res.total_withdrawn) || 0);
        this.availableBalance.set(Number(res.available_balance) || 0);
        this.pendingWithdrawalAmount.set(Number(res.pending_withdrawal_amount) || 0);
        if (res.destination_country === 'US' || res.destination_country === 'MX') {
          this.selectedCountry.set(res.destination_country);
        }
      },
      error: (err) => console.error('Error cargando balance:', err),
    });
  }

  loadWithdrawals(): void {
    this.paymentService.getWithdrawalHistory().subscribe({
      next: (items) => this.withdrawals.set(items as WithdrawalItem[]),
      error: (err) => console.error('Error cargando historial de retiros:', err),
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

  openWithdrawModal(): void {
    this.withdrawError.set(null);
    this.withdrawSuccess.set(null);
    this.withdrawAmount.set(this.availableBalance() > 0 ? this.availableBalance() : 10);
    this.showWithdrawModal.set(true);
  }

  closeWithdrawModal(): void {
    this.showWithdrawModal.set(false);
    this.withdrawError.set(null);
  }

  submitWithdrawal(): void {
    const amount = Number(this.withdrawAmount());
    if (!amount || amount < 10) {
      this.withdrawError.set('El monto mínimo para retirar es de $10.00 USD.');
      return;
    }

    if (amount > this.availableBalance()) {
      this.withdrawError.set(`Fondos insuficientes. Tu balance disponible es de $${this.availableBalance().toFixed(2)} USD.`);
      return;
    }

    this.requestingWithdrawal.set(true);
    this.withdrawError.set(null);

    this.paymentService.requestWithdrawal(amount, this.selectedCountry()).subscribe({
      next: () => {
        this.requestingWithdrawal.set(false);
        this.withdrawSuccess.set('¡Solicitud de retiro enviada con éxito! Está en revisión.');
        setTimeout(() => {
          this.closeWithdrawModal();
          this.refreshAll();
        }, 1500);
      },
      error: (err) => {
        this.requestingWithdrawal.set(false);
        const msg = err?.error?.detail || 'Ocurrió un error al procesar tu solicitud.';
        this.withdrawError.set(msg);
      },
    });
  }
}


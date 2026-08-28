import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../core/checkout.service';

/** Duración del estado "Procesando…" antes de mostrar la confirmación. */
const FAKE_PROCESSING_MS = 1400;

@Component({
  selector: 'app-stripe-checkout',
  templateUrl: './stripe-checkout.html',
  styleUrl: './stripe-checkout.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class StripeCheckout {
  readonly checkout = inject(CheckoutService);

  readonly email = signal('atleta.demo@buymeashake.fit');
  readonly cardName = signal('Atleta Demo');
  readonly cardNumber = signal('4242 4242 4242 4242');
  readonly expiry = signal('12/29');
  readonly cvc = signal('123');
  readonly zip = signal('44100');
  readonly processing = signal(false);

  readonly brand = computed(() => {
    const first = this.cardNumber().replace(/\D/g, '').charAt(0);
    if (first === '4') return 'Visa';
    if (first === '5') return 'Mastercard';
    if (first === '3') return 'Amex';
    if (first === '6') return 'Discover';
    return 'Tarjeta';
  });

  readonly canPay = computed(() => {
    if (this.processing()) return false;
    return (
      this.email().includes('@') &&
      this.cardNumber().replace(/\D/g, '').length >= 15 &&
      this.expiry().length === 5 &&
      this.cvc().length >= 3
    );
  });

  onEmailInput(value: string): void {
    this.email.set(value);
  }

  onNameInput(value: string): void {
    this.cardName.set(value);
  }

  /** Agrupa el número en bloques de cuatro dígitos mientras se escribe. */
  onCardInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    this.cardNumber.set(groups ? groups.join(' ') : '');
  }

  onExpiryInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      this.expiry.set(digits);
      return;
    }
    this.expiry.set(`${digits.slice(0, 2)}/${digits.slice(2)}`);
  }

  onCvcInput(value: string): void {
    this.cvc.set(value.replace(/\D/g, '').slice(0, 4));
  }

  onZipInput(value: string): void {
    this.zip.set(value.replace(/[^\dA-Za-z]/g, '').slice(0, 10));
  }

  pay(): void {
    if (!this.canPay()) return;

    this.processing.set(true);
    setTimeout(() => {
      this.processing.set(false);
      this.checkout.markPaid();
    }, FAKE_PROCESSING_MS);
  }

  close(): void {
    if (this.processing()) return;
    this.checkout.close();
  }

  onEscape(): void {
    if (!this.checkout.open()) return;
    this.close();
  }
}

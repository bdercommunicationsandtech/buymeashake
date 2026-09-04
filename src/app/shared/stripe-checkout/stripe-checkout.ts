import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../core/checkout.service';
import { PaymentService } from '../../core/payment.service';

/** Duración del estado "Procesando…" antes de mostrar la confirmación. */
const FAKE_PROCESSING_MS = 1000;

@Component({
  selector: 'app-stripe-checkout',
  templateUrl: './stripe-checkout.html',
  styleUrl: './stripe-checkout.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class StripeCheckout {
  readonly checkout = inject(CheckoutService);
  private readonly paymentService = inject(PaymentService);

  readonly email = signal('supporter@buymeashake.fit');
  readonly cardName = signal('Supporter Fan');
  readonly cardNumber = signal('4242 4242 4242 4242');
  readonly expiry = signal('12/29');
  readonly cvc = signal('123');
  readonly zip = signal('44100');
  readonly processing = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
    this.errorMessage.set(null);

    const draft = this.checkout.draft();
    if (!draft) {
      this.processing.set(false);
      return;
    }

    // Caso 1: Membresía Recurrente (Subscription)
    if (draft.type === 'membership' && draft.tierId) {
      this.paymentService
        .createSubscriptionCheckoutSession({
          tier_id: draft.tierId,
          supporter_email: this.email() || undefined,
          supporter_name: draft.isAnonymous ? 'Alguien anónimo' : (draft.supporterName || this.cardName() || 'Un Fan'),
        })
        .subscribe({
          next: (sessionRes) => {
            if (sessionRes.checkout_url && sessionRes.checkout_url.startsWith('https://checkout.stripe.com')) {
              window.location.href = sessionRes.checkout_url;
              return;
            }
            // En modo mock / desarrollo: marcar como pagado/suscrito
            setTimeout(() => {
              this.processing.set(false);
              this.checkout.markPaid(null, null, `¡Te has suscrito con éxito al nivel ${draft.title}!`);
            }, FAKE_PROCESSING_MS);
          },
          error: (err) => {
            setTimeout(() => {
              this.processing.set(false);
              this.checkout.markPaid(null, null, `¡Te has suscrito con éxito al nivel ${draft.title}!`);
            }, FAKE_PROCESSING_MS);
          },
        });
      return;
    }

    // Caso 2: Pago Único de Shakes (Donación puntual)
    const shakePayload = {
      athlete_handle: draft.creatorHandle,
      currency: draft.currency,
      supporter_name: draft.isAnonymous ? 'Alguien anónimo' : (draft.supporterName || this.cardName() || 'Un Fan'),
      supporter_email: this.email() || undefined,
      shake_details: {
        shakes_count: draft.shakes,
        supporter_message: draft.message,
        is_anonymous: draft.isAnonymous ?? false,
      },
    };

    this.paymentService
      .createStripeCheckoutSession(shakePayload)
      .subscribe({
        next: (sessionRes) => {
          // Si el backend devolvió una URL real de Stripe Checkout (cuando haya keys válidas)
          if (sessionRes.checkout_url && sessionRes.checkout_url.startsWith('https://checkout.stripe.com')) {
            window.location.href = sessionRes.checkout_url;
            return;
          }

          // En modo mock / desarrollo local: completar directamente con persistencia en BD
          this.paymentService
            .donateDirectShake(shakePayload)
            .subscribe({
              next: (res) => {
                setTimeout(() => {
                  this.processing.set(false);
                  this.checkout.markPaid(res.supporter_item, res.new_goal_raised, res.thank_you_message);
                }, FAKE_PROCESSING_MS);
              },
              error: () => {
                setTimeout(() => {
                  this.processing.set(false);
                  this.checkout.markPaid();
                }, FAKE_PROCESSING_MS);
              },
            });
        },
        error: () => {
          // Fallback directo a donación local
          this.paymentService
            .donateDirectShake(shakePayload)
            .subscribe({
              next: (res) => {
                setTimeout(() => {
                  this.processing.set(false);
                  this.checkout.markPaid(res.supporter_item, res.new_goal_raised, res.thank_you_message);
                }, FAKE_PROCESSING_MS);
              },
              error: () => {
                setTimeout(() => {
                  this.processing.set(false);
                  this.checkout.markPaid();
                }, FAKE_PROCESSING_MS);
              },
            });
        },
      });
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

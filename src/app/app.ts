import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { CheckoutService } from './core/checkout.service';
import { PaymentService } from './core/payment.service';
import { Footer } from './shared/footer/footer';
import { Header } from './shared/header/header';
import { StripeCheckout } from './shared/stripe-checkout/stripe-checkout';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, StripeCheckout],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutService);
  private readonly paymentService = inject(PaymentService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly showPublicChrome = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/dashboard') && !url.startsWith('/supporter');
  });

  constructor() {
    // Overlay al boot: no esperar al lazy-load del perfil del atleta
    this.handleStripeReturnFromUrl();
  }

  private handleStripeReturnFromUrl(): void {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentOk = params.get('payment') === 'success';
    const membershipOk = params.get('membership') === 'success';
    if (!paymentOk && !membershipOk) return;

    const sessionId = params.get('session_id') || '';
    const txUuid = params.get('tx') || '';
    const handle = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
    const isMembership = membershipOk;
    const fallbackThanks = isMembership
      ? '¡Te has suscrito con éxito!'
      : '¡Muchas gracias por tu apoyo y por ser parte de mi camino deportivo!';

    console.log('[App] Stripe return', { sessionId, txUuid, handle });

    this.checkout.beginStripeReturn({
      creatorHandle: handle,
      creatorName: handle || 'Atleta',
      type: isMembership ? 'membership' : 'shake',
    });

    const finishSuccess = (res?: {
      supporter_item?: unknown;
      new_goal_raised?: number | null;
      thank_you_message?: string | null;
    }) => {
      this.checkout.markPaid(
        res?.supporter_item ?? null,
        res?.new_goal_raised ?? null,
        res?.thank_you_message || fallbackThanks,
      );
      // Limpiar query sin perder el overlay (estado en CheckoutService)
      setTimeout(() => {
        const path = window.location.pathname || '/';
        void this.router.navigateByUrl(path, { replaceUrl: true });
      }, 400);
    };

    if (!sessionId && !txUuid) {
      finishSuccess();
      return;
    }

    this.paymentService.verifySession(sessionId, txUuid).subscribe({
      next: (res) => {
        console.log('[App] Sesión verificada:', res);
        finishSuccess(res);
      },
      error: (err: unknown) => {
        console.error('[App] Error verificando sesión:', err);
        if (txUuid) {
          this.paymentService.verifySession('', txUuid).subscribe({
            next: (res) => finishSuccess(res),
            error: () => finishSuccess(),
          });
        } else {
          finishSuccess();
        }
      },
    });
  }
}

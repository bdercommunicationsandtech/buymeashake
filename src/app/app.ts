import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
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
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/footer/footer';
import { Header } from './shared/header/header';
import { StripeCheckout } from './shared/stripe-checkout/stripe-checkout';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, StripeCheckout],
  templateUrl: './app.html',
})
export class App {}

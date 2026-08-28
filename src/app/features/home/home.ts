import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import {
  ACTIVITIES,
  Activity,
  DEMO_CREATOR,
  HOW_IT_WORKS,
  SHAKE_PRICE,
  TICKER_ITEMS,
} from '../../core/demo';
import { SportWidget } from '../../shared/sport-widget/sport-widget';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SportWidget],
  templateUrl: './home.html',
})
export class Home {
  private readonly checkout = inject(CheckoutService);

  readonly creator = DEMO_CREATOR;
  readonly steps = HOW_IT_WORKS;
  readonly ticker = TICKER_ITEMS;
  readonly shakePrice = SHAKE_PRICE;

  readonly spotlight = signal<Activity>(ACTIVITIES[0]);

  readonly stats = [
    { value: '0%', label: 'de mensualidad' },
    { value: `$${SHAKE_PRICE}`, label: 'por shake' },
    { value: '1 clic', label: 'para apoyar' },
    { value: '2 min', label: 'para publicar' },
  ];

  onSpotlightChange(activity: Activity): void {
    this.spotlight.set(activity);
  }

  supportDemo(shakes: number): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes,
      message: 'Probando el prototipo de buymeashake.fit',
      activity: this.spotlight().id,
    });
  }
}

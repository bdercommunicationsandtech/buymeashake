import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../core/checkout.service';
import {
  Activity,
  ACTIVITIES,
  DEMO_CREATOR,
  QUICK_SHAKES,
  RECENT_SUPPORTERS,
  SHAKE_PRICE,
} from '../../core/demo';
import { SportWidget } from '../../shared/sport-widget/sport-widget';

@Component({
  selector: 'app-creator',
  imports: [SportWidget],
  templateUrl: './creator.html',
})
export class Creator {
  private readonly checkout = inject(CheckoutService);

  readonly creator = DEMO_CREATOR;
  readonly supporters = RECENT_SUPPORTERS;
  readonly quickShakes = QUICK_SHAKES;
  readonly shakePrice = SHAKE_PRICE;

  readonly shakes = signal(3);
  readonly message = signal('');
  readonly activity = signal<Activity>(ACTIVITIES[0]);

  readonly amount = computed(() => this.shakes() * SHAKE_PRICE);

  readonly goalPercent = computed(() =>
    Math.round(Math.min((this.creator.goalRaised / this.creator.goalTarget) * 100, 100))
  );

  readonly goalWithSupport = computed(() =>
    Math.min(this.creator.goalRaised + this.amount(), this.creator.goalTarget)
  );

  /** Barra fantasma que anticipa el efecto del apoyo antes de pagar. */
  readonly previewPercent = computed(() =>
    Math.round(
      Math.min(((this.creator.goalRaised + this.amount()) / this.creator.goalTarget) * 100, 100)
    )
  );

  readonly remaining = computed(() =>
    Math.max(this.creator.goalTarget - this.creator.goalRaised, 0)
  );

  setShakes(value: number): void {
    this.shakes.set(Math.min(Math.max(Math.round(value) || 1, 1), 99));
  }

  onShakesInput(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.setShakes(parsed);
  }

  onMessageInput(value: string): void {
    this.message.set(value.slice(0, 240));
  }

  onActivityChange(activity: Activity): void {
    this.activity.set(activity);
  }

  support(): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: this.shakes(),
      message: this.message(),
      activity: this.activity().id,
    });
  }
}

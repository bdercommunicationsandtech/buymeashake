import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ACTIVITIES, Activity, ActivityId } from '../../core/demo';

/**
 * Interruptor temporal. Con el carrusel apagado el widget muestra únicamente el
 * shaker y se anima sólo al interactuar con él. Las otras seis figuras y sus
 * controles siguen implementados: basta ponerlo en `true` para recuperarlos.
 */
export const SPORT_WIDGET_CAROUSEL_ENABLED = false;

/** Distancia mínima de arrastre (px) para considerar un cambio de figura. */
const SWIPE_THRESHOLD = 44;

/** Cuánto sigue agitándose la escena después de soltar el puntero. */
const SETTLE_MS = 900;

/** Duración del agitón que se dispara desde el teclado. */
const BURST_MS = 700;

let widgetSequence = 0;

@Component({
  selector: 'app-sport-widget',
  templateUrl: './sport-widget.html',
  styleUrl: './sport-widget.css',
  host: { class: 'block' },
})
export class SportWidget {
  readonly compact = input(false);
  /** Muestra la figura suelta, sin tarjeta ni encabezado, para usarla en un hero. */
  readonly bare = input(false);
  readonly showControls = input(true);
  readonly autoplay = input(true);
  readonly initialActivity = input<ActivityId>('shaker');

  readonly activityChange = output<Activity>();

  /** Sufijo único para los ids de clipPath/gradient de cada instancia. */
  readonly uid = `sw${++widgetSequence}`;

  readonly activities = ACTIVITIES;
  readonly showCarousel = SPORT_WIDGET_CAROUSEL_ENABLED;

  readonly index = linkedSignal(() => {
    const found = ACTIVITIES.findIndex((activity) => activity.id === this.initialActivity());
    return found < 0 ? 0 : found;
  });

  readonly playing = linkedSignal(() => this.autoplay());
  readonly intervalSeconds = signal(2.6);

  readonly hovering = signal(false);
  readonly shaking = signal(false);
  readonly settling = signal(false);

  /** La escena sólo se anima mientras el usuario la toca o la sobrevuela. */
  readonly live = computed(() => this.hovering() || this.shaking() || this.settling());

  readonly current = computed(() => ACTIVITIES[this.index()]);
  readonly kcalPerHour = computed(() => this.current().kcal * 6);

  private dragOriginX: number | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private burstTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer(this.settleTimer);
      this.clearTimer(this.burstTimer);
    });

    effect((onCleanup) => {
      if (!this.showCarousel || !this.playing()) return;

      const timer = setInterval(() => this.next(), this.intervalSeconds() * 1000);
      onCleanup(() => clearInterval(timer));
    });

    effect(() => this.activityChange.emit(this.current()));
  }

  next(): void {
    this.index.update((value) => (value + 1) % ACTIVITIES.length);
  }

  previous(): void {
    this.index.update((value) => (value - 1 + ACTIVITIES.length) % ACTIVITIES.length);
  }

  goTo(target: number): void {
    if (target < 0 || target >= ACTIVITIES.length) return;
    this.index.set(target);
  }

  togglePlaying(): void {
    this.playing.update((value) => !value);
  }

  setIntervalSeconds(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.intervalSeconds.set(Math.min(Math.max(parsed, 0.8), 6));
  }

  onPointerEnter(): void {
    this.hovering.set(true);
  }

  onPointerLeave(): void {
    this.hovering.set(false);
    this.dragOriginX = null;
    if (!this.shaking()) return;

    this.shaking.set(false);
    this.startSettle();
  }

  onPointerDown(event: PointerEvent): void {
    this.dragOriginX = event.clientX;
    this.clearTimer(this.settleTimer);
    this.settling.set(false);
    this.shaking.set(true);
  }

  onPointerUp(event: PointerEvent): void {
    const origin = this.dragOriginX;
    this.dragOriginX = null;
    this.shaking.set(false);
    this.startSettle();

    if (!this.showCarousel || origin === null) return;

    const delta = event.clientX - origin;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta < 0) this.next();
    else this.previous();
  }

  onPointerCancel(): void {
    this.dragOriginX = null;
    this.shaking.set(false);
    this.startSettle();
  }

  onFocus(): void {
    this.hovering.set(true);
  }

  onBlur(): void {
    this.hovering.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
      event.preventDefault();
      if (this.showCarousel) this.togglePlaying();
      else this.shakeBurst();
      return;
    }

    if (!this.showCarousel) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    }
  }

  /** Agitón corto para quien navega con teclado. */
  private shakeBurst(): void {
    this.clearTimer(this.burstTimer);
    this.shaking.set(true);
    this.burstTimer = setTimeout(() => {
      this.shaking.set(false);
      this.startSettle();
    }, BURST_MS);
  }

  private startSettle(): void {
    this.clearTimer(this.settleTimer);
    this.settling.set(true);
    this.settleTimer = setTimeout(() => this.settling.set(false), SETTLE_MS);
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer) clearTimeout(timer);
  }
}

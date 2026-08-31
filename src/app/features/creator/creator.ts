import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

export interface CreatorProduct {
  title: string;
  type: string;
  price: number;
  description: string;
}

export interface CreatorTier {
  name: string;
  price: number;
  description: string;
  benefits: string[];
}

export interface CreatorBooking {
  title: string;
  duration: string;
  price: number;
  platform: string;
}

@Component({
  selector: 'app-creator',
  standalone: true,
  imports: [CommonModule, SportWidget],
  templateUrl: './creator.html',
})
export class Creator {
  private readonly checkout = inject(CheckoutService);

  readonly creator = DEMO_CREATOR;
  readonly supporters = RECENT_SUPPORTERS;
  readonly quickShakes = QUICK_SHAKES;
  readonly shakePrice = SHAKE_PRICE;

  readonly activeTab = signal<'shakes' | 'memberships' | 'shop' | 'booking'>('shakes');

  readonly shakes = signal(3);
  readonly message = signal('');
  readonly activity = signal<Activity>(ACTIVITIES[0]);
  readonly currency = signal<'USD' | 'MXN'>('USD');

  // Booking picker state
  readonly selectedDate = signal('2026-09-02');
  readonly selectedTime = signal('18:00');
  readonly bookingSuccess = signal(false);

  readonly products: CreatorProduct[] = [
    {
      title: 'Guía de Hipertrofia & Fuerza (12 Semanas)',
      type: 'PDF',
      price: 19.99,
      description: 'Plan estructurado de 4 días con progresiones de sobrecarga y videos explicativos.',
    },
    {
      title: 'Plantilla de Registro de Levantamientos (Notion)',
      type: 'Plantilla',
      price: 9.99,
      description: 'Calculadora automática de 1RM, volumen de entrenamiento y RPE semanal.',
    },
  ];

  readonly tiers: CreatorTier[] = [
    {
      name: 'Nivel Atleta (Comunidad)',
      price: 5,
      description: 'Acceso a la comunidad privada y publicaciones exclusivas.',
      benefits: ['Acceso al canal privado de Discord', 'Posts y videos de técnica exclusivos', 'Insignia en tu perfil'],
    },
    {
      name: 'Nivel Pro (Rutinas & Q&A)',
      price: 15,
      description: 'Bloques de entrenamiento semanales y Q&A grupal mensual.',
      benefits: ['Todo lo del Nivel Atleta', 'Descarga libre de todos mis PDFs', 'Sesión mensual grupal en Meet'],
    },
  ];

  readonly bookingServices: CreatorBooking[] = [
    {
      title: 'Revisión de Técnica 1-a-1 en Vivo',
      duration: '45 min',
      price: 35.0,
      platform: 'Google Meet',
    },
    {
      title: 'Asesoría de Programación y Periodización',
      duration: '60 min',
      price: 50.0,
      platform: 'Google Meet',
    },
  ];

  readonly currentPrice = computed(() => this.currency() === 'USD' ? SHAKE_PRICE : 50);
  readonly amount = computed(() => this.shakes() * this.currentPrice());

  readonly goalPercent = computed(() =>
    Math.round(Math.min((this.creator.goalRaised / this.creator.goalTarget) * 100, 100))
  );

  readonly goalWithSupport = computed(() =>
    Math.min(this.creator.goalRaised + this.amount(), this.creator.goalTarget)
  );

  readonly previewPercent = computed(() =>
    Math.round(
      Math.min(((this.creator.goalRaised + this.amount()) / this.creator.goalTarget) * 100, 100)
    )
  );

  readonly remaining = computed(() =>
    Math.max(this.creator.goalTarget - this.creator.goalRaised, 0)
  );

  setTab(tab: 'shakes' | 'memberships' | 'shop' | 'booking'): void {
    this.activeTab.set(tab);
  }

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

  bookSession(service: CreatorBooking): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: Math.round(service.price / this.currentPrice()),
      message: `Reserva de Asesoría 1:1: ${service.title} para el ${this.selectedDate()} a las ${this.selectedTime()}`,
      activity: this.activity().id,
      currency: this.currency(),
      unitPrice: this.currentPrice(),
    });
  }

  buyProduct(product: CreatorProduct): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: Math.round(product.price / this.currentPrice()),
      message: `Compra de producto digital: ${product.title}`,
      activity: this.activity().id,
      currency: this.currency(),
      unitPrice: this.currentPrice(),
    });
  }

  joinTier(tier: CreatorTier): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: Math.round(tier.price / this.currentPrice()),
      message: `Suscripción mensual a: ${tier.name}`,
      activity: this.activity().id,
      currency: this.currency(),
      unitPrice: this.currentPrice(),
    });
  }

  support(): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: this.shakes(),
      message: this.message(),
      activity: this.activity().id,
      currency: this.currency(),
      unitPrice: this.currentPrice(),
    });
  }
}

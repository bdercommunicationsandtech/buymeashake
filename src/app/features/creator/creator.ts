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
import {
  IconButtonShareComponent,
  IconButtonSupportComponent,
  IconCalendarComponent,
  IconDumbbellComponent,
  IconKarateComponent,
  IconPackageComponent,
  IconRunningComponent,
  IconShakerComponent,
  IconSoccerComponent,
} from '../../shared/icons';

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

export interface CreatorBookingService {
  id: string;
  title: string;
  duration: string;
  price: number;
  description: string;
  platform: string;
  category: 'Conocer al Atleta' | 'Asesoría de Técnica' | 'Consultoría Deportiva';
}

export interface CalendarDay {
  dayNumber: number;
  dateStr: string;
  isAvailable: boolean;
  isPast: boolean;
  dayName: string;
}

@Component({
  selector: 'app-creator',
  standalone: true,
  imports: [
    CommonModule,
    IconShakerComponent,
    IconDumbbellComponent,
    IconSoccerComponent,
    IconKarateComponent,
    IconRunningComponent,
    IconButtonShareComponent,
    IconButtonSupportComponent,
    IconPackageComponent,
    IconCalendarComponent,
  ],
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

  // --- CALENDLY-STYLE 1-ON-1 BOOKING STATE ---
  readonly selectedService = signal<CreatorBookingService | null>(null);
  readonly selectedDate = signal<string>('2026-09-03');
  readonly selectedTimeSlot = signal<string>('18:00');
  readonly bookingStep = signal<'select-service' | 'select-time' | 'confirm'>('select-service');

  readonly availableTimeSlots = signal<string[]>([
    '09:00 AM',
    '10:30 AM',
    '12:00 PM',
    '04:00 PM',
    '05:30 PM',
    '07:00 PM',
  ]);

  readonly calendarDays = signal<CalendarDay[]>([
    { dayNumber: 1, dateStr: '2026-09-01', isAvailable: false, isPast: true, dayName: 'Mar' },
    { dayNumber: 2, dateStr: '2026-09-02', isAvailable: false, isPast: true, dayName: 'Mié' },
    { dayNumber: 3, dateStr: '2026-09-03', isAvailable: true, isPast: false, dayName: 'Jue' },
    { dayNumber: 4, dateStr: '2026-09-04', isAvailable: true, isPast: false, dayName: 'Vie' },
    { dayNumber: 5, dateStr: '2026-09-05', isAvailable: true, isPast: false, dayName: 'Sáb' },
    { dayNumber: 6, dateStr: '2026-09-06', isAvailable: false, isPast: false, dayName: 'Dom' },
    { dayNumber: 7, dateStr: '2026-09-07', isAvailable: true, isPast: false, dayName: 'Lun' },
    { dayNumber: 8, dateStr: '2026-09-08', isAvailable: true, isPast: false, dayName: 'Mar' },
    { dayNumber: 9, dateStr: '2026-09-09', isAvailable: true, isPast: false, dayName: 'Mié' },
    { dayNumber: 10, dateStr: '2026-09-10', isAvailable: true, isPast: false, dayName: 'Jue' },
    { dayNumber: 11, dateStr: '2026-09-11', isAvailable: true, isPast: false, dayName: 'Vie' },
    { dayNumber: 12, dateStr: '2026-09-12', isAvailable: false, isPast: false, dayName: 'Sáb' },
  ]);

  readonly bookingServices: CreatorBookingService[] = [
    {
      id: 'srv_1',
      title: 'Charla 1-a-1 & Conocer al Atleta',
      duration: '30 min',
      price: 25.0,
      description: 'Espacio para conversar sobre mi trayectoria, mentalidad deportiva, consejos y motivación.',
      platform: 'Google Meet',
      category: 'Conocer al Atleta',
    },
    {
      id: 'srv_2',
      title: 'Revisión de Técnica de Levantamiento',
      duration: '45 min',
      price: 40.0,
      description: 'Analizamos tus videos de sentadilla, banca o peso muerto y corregimos biomecánica en vivo.',
      platform: 'Google Meet',
      category: 'Asesoría de Técnica',
    },
    {
      id: 'srv_3',
      title: 'Asesoría de Programación & Periodización',
      duration: '60 min',
      price: 60.0,
      description: 'Estructuración de tu bloque de entrenamiento, selección de ejercicios y gestión de fatiga.',
      platform: 'Google Meet',
      category: 'Consultoría Deportiva',
    },
  ];

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

  // --- CALENDLY WORKFLOW METHODS ---
  selectServiceToBook(service: CreatorBookingService): void {
    this.selectedService.set(service);
    this.bookingStep.set('select-time');
  }

  selectDate(day: CalendarDay): void {
    if (!day.isAvailable || day.isPast) return;
    this.selectedDate.set(day.dateStr);
  }

  selectSlot(slot: string): void {
    this.selectedTimeSlot.set(slot);
  }

  backToServices(): void {
    this.bookingStep.set('select-service');
  }

  confirmBookingCheckout(): void {
    const srv = this.selectedService();
    if (!srv) return;

    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: Math.round(srv.price / this.currentPrice()),
      message: `Reserva 1-a-1: ${srv.title} · Fecha: ${this.selectedDate()} a las ${this.selectedTimeSlot()}`,
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

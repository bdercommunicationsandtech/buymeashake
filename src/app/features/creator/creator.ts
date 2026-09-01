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
import { PostCardComponent, PostItem } from '../../shared/post-card/post-card.component';

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
    PostCardComponent,
  ],
  templateUrl: './creator.html',
})
export class Creator {
  private readonly checkout = inject(CheckoutService);

  readonly creator = DEMO_CREATOR;
  readonly supporters = RECENT_SUPPORTERS;
  readonly quickShakes = QUICK_SHAKES;
  readonly shakePrice = SHAKE_PRICE;

  readonly activeTab = signal<'shakes' | 'memberships' | 'shop' | 'booking' | 'posts'>('shakes');

  readonly posts = signal<PostItem[]>([
    {
      id: 'p1',
      title: 'Semana de Descarga (Deload): Por qué es clave para ganar fuerza y evitar fatiga',
      excerpt: 'Muchos cometen el error de entrenar al fallo 52 semanas consecutivas. Aquí te explico mi protocolo exacto de volumen y RPE para descargar sin perder masa muscular...',
      authorName: 'Sofía Ramírez',
      authorHandle: 'sofifit',
      publishedAt: 'Hace 2 días',
      likesCount: 38,
      commentsCount: 9,
      isMembersOnly: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'p2',
      title: 'Rutina exclusiva de movilidad para sentadilla profunda y calentamiento de cadera',
      excerpt: 'Bloque completo de 15 minutos paso a paso para mejorar la dorsiflexión de tobillo y la apertura de cadera antes de sesiones pesadas...',
      authorName: 'Sofía Ramírez',
      authorHandle: 'sofifit',
      publishedAt: 'Hace 5 días',
      likesCount: 64,
      commentsCount: 14,
      isMembersOnly: true,
      requiredTierName: 'Comunidad Pro',
      coverImageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1200&auto=format&fit=crop',
      isUnlocked: false,
    },
    {
      id: 'p3',
      title: 'Mi preparación nutricional y suplementación rumbo al Campeonato Nacional',
      excerpt: 'Desglose gramo por gramo de mis macronutrientes actuales, timing de creatina, cafeína y electrolitos en días de doble sesión...',
      authorName: 'Sofía Ramírez',
      authorHandle: 'sofifit',
      publishedAt: 'Hace 1 semana',
      likesCount: 92,
      commentsCount: 21,
      isMembersOnly: true,
      requiredTierName: 'Atleta Elite',
      coverImageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1200&auto=format&fit=crop',
      isUnlocked: false,
    },
  ]);

  likePost(postId: string): void {
    this.posts.update((list) =>
      list.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p))
    );
  }

  unlockPost(post: PostItem): void {
    this.setTab('memberships');
  }

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

  setTab(tab: 'shakes' | 'memberships' | 'shop' | 'booking' | 'posts'): void {
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
      type: 'booking',
      title: srv.title,
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: 1,
      unitPrice: srv.price,
      currency: this.currency(),
      message: `Reserva 1-a-1: ${srv.title}`,
      activity: this.activity().id,
      bookingDetails: {
        date: this.selectedDate(),
        time: this.selectedTimeSlot(),
        platform: srv.platform,
        meetingLink: 'https://meet.google.com/shk-fit-demo',
      },
    });
  }

  buyProduct(product: CreatorProduct): void {
    this.checkout.start({
      type: 'product',
      title: product.title,
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: 1,
      unitPrice: product.price,
      currency: this.currency(),
      message: `Compra de producto digital: ${product.title}`,
      activity: this.activity().id,
      downloadUrl: 'https://buymeashake.fit/downloads/guia-hipertrofia-12-semanas.pdf',
    });
  }

  joinTier(tier: CreatorTier): void {
    this.checkout.start({
      type: 'membership',
      title: tier.name,
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: 1,
      unitPrice: tier.price,
      currency: this.currency(),
      message: `Suscripción mensual a: ${tier.name}`,
      activity: this.activity().id,
    });
  }

  support(): void {
    this.checkout.start({
      type: 'shake',
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

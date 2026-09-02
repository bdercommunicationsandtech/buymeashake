import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import { ExploreService } from '../../core/explore.service';
import { PaymentService } from '../../core/payment.service';
import { AuthService } from '../../core/auth.service';
import { SupporterService } from '../../core/supporter.service';
import {
  Activity,
  ACTIVITIES,
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
import { FollowModalComponent } from '../../shared/follow-modal/follow-modal.component';
import { CreatorProfile } from '../../core/api.models';

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

export interface CreatorView {
  handle: string;
  name: string;
  role: string;
  city: string;
  bio: string;
  initials: string;
  goalTitle: string;
  goalTarget: number;
  goalRaised: number;
  supporters: number;
  disciplines: string[];
  shakePrice: number;
  currency: 'USD' | 'MXN';
  coverImageUrl: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

@Component({
  selector: 'app-creator',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
    FollowModalComponent,
  ],
  templateUrl: './creator.html',
})
export class Creator {
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutService);
  private readonly exploreService = inject(ExploreService);
  private readonly paymentService = inject(PaymentService);
  private readonly authService = inject(AuthService);
  private readonly supporterService = inject(SupporterService);

  readonly username = input.required<string>();

  readonly creatorView = signal<CreatorView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly supporters = signal<any[]>([]);
  readonly quickShakes = QUICK_SHAKES;

  readonly followModalOpen = signal(false);
  readonly isFollowing = signal(false);
  readonly isTogglingFollow = signal(false);

  readonly activeTab = signal<'shakes' | 'memberships' | 'shop' | 'booking' | 'posts'>('shakes');
  readonly posts = signal<PostItem[]>([]);

  readonly bookingServices = signal<CreatorBookingService[]>([]);
  readonly products = signal<CreatorProduct[]>([]);
  readonly tiers = signal<CreatorTier[]>([]);

  readonly shakes = signal(3);
  readonly supporterName = signal('');
  readonly isAnonymous = signal(false);
  readonly message = signal('');
  readonly activity = signal<Activity>(ACTIVITIES[0]);
  readonly currency = signal<'USD' | 'MXN'>('USD');

  readonly selectedService = signal<CreatorBookingService | null>(null);
  readonly selectedDate = signal<string>('2026-09-03');
  readonly selectedTimeSlot = signal<string>('18:00');
  readonly bookingStep = signal<'select-service' | 'select-time' | 'confirm'>('select-service');

  readonly availableTimeSlots = signal<string[]>([
    '09:00 AM', '10:30 AM', '12:00 PM', '04:00 PM', '05:30 PM', '07:00 PM',
  ]);

  readonly calendarDays = signal<CalendarDay[]>([
    { dayNumber: 3, dateStr: '2026-09-03', isAvailable: true, isPast: false, dayName: 'Jue' },
    { dayNumber: 4, dateStr: '2026-09-04', isAvailable: true, isPast: false, dayName: 'Vie' },
    { dayNumber: 5, dateStr: '2026-09-05', isAvailable: true, isPast: false, dayName: 'Sáb' },
    { dayNumber: 7, dateStr: '2026-09-07', isAvailable: true, isPast: false, dayName: 'Lun' },
  ]);

  readonly coverStyle = computed(() => {
    const url = this.creatorView()?.coverImageUrl;
    if (url) {
      return `url('${url}')`;
    }
    return "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop')";
  });

  readonly shakePrice = computed(() => this.creatorView()?.shakePrice ?? SHAKE_PRICE);

  readonly currentPrice = computed(() => {
    const base = this.shakePrice();
    return this.currency() === 'USD' ? base : Math.round(base * 16);
  });

  readonly amount = computed(() => this.shakes() * this.currentPrice());

  readonly goalPercent = computed(() => {
    const c = this.creatorView();
    if (!c?.goalTarget) return 0;
    return Math.round(Math.min((c.goalRaised / c.goalTarget) * 100, 100));
  });

  readonly previewPercent = computed(() => {
    const c = this.creatorView();
    if (!c?.goalTarget) return 0;
    return Math.round(Math.min(((c.goalRaised + this.amount()) / c.goalTarget) * 100, 100));
  });

  readonly remaining = computed(() => {
    const c = this.creatorView();
    if (!c) return 0;
    return Math.max(c.goalTarget - c.goalRaised, 0);
  });

  readonly goalWithSupport = computed(() => {
    const c = this.creatorView();
    if (!c) return 0;
    return c.goalRaised + this.amount();
  });

  openFollow(): void {
    const handle = this.creatorView()?.handle || this.username();

    // Si el usuario ya está autenticado, seguir/dejar de seguir con 1 clic directo sin modal
    if (this.authService.isAuthenticated()) {
      if (this.isTogglingFollow()) return;
      this.isTogglingFollow.set(true);

      if (this.isFollowing()) {
        this.supporterService.unfollowAthlete(handle).subscribe({
          next: () => {
            this.isFollowing.set(false);
            this.isTogglingFollow.set(false);
          },
          error: () => this.isTogglingFollow.set(false),
        });
      } else {
        this.supporterService.followAthlete(handle).subscribe({
          next: () => {
            this.isFollowing.set(true);
            this.isTogglingFollow.set(false);
          },
          error: () => this.isTogglingFollow.set(false),
        });
      }
      return;
    }

    // Si es visitante no registrado, abrir modal de registro / OTP
    this.followModalOpen.set(true);
  }

  closeFollow(): void {
    this.followModalOpen.set(false);
  }

  onFollowSuccess(data: { email: string; name: string }): void {
    this.isFollowing.set(true);
    // Redirige al portal del supporter (studio.buymeacoffee.com/home style)
    this.router.navigate(['/fan/home'], {
      queryParams: { followed: this.creatorView()?.handle || this.username() },
    });
  }

  sharePage(): void {
    const url = window.location.href;
    const name = this.creatorView()?.name || this.username();
    if (navigator.share) {
      navigator.share({
        title: `Apoya a ${name} en Buy Me a Shake`,
        text: `¡Invítale un Shake a ${name} para apoyar su carrera deportiva!`,
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert('¡Enlace copiado al portapapeles!');
      });
    }
  }

  constructor() {
    effect(() => {
      const handle = this.username();
      if (handle) {
        this.loadCreator(handle);
      }
    });

    // Escucha en tiempo real si el supporter completó una donación
    effect(() => {
      const last = this.checkout.lastDonation();
      if (last) {
        if (last.newGoalRaised !== undefined && last.newGoalRaised !== null) {
          this.creatorView.update((c) => (c ? { ...c, goalRaised: last.newGoalRaised! } : c));
        }
        if (last.supporterItem) {
          const s = last.supporterItem;
          const initials = s.supporter_name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'SP';

          this.supporters.update((list) => [
            {
              name: s.supporter_name,
              shakes: s.shakes_count,
              message: s.supporter_message || '¡Mucho éxito con tu entrenamiento!',
              when: 'Justo ahora',
              initials: initials,
            },
            ...list,
          ]);

          this.creatorView.update((c) => (c ? { ...c, supporters: c.supporters + 1 } : c));
        }
      }
    });
  }

  private loadCreator(handle: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.exploreService.getCreatorProfile(handle).subscribe({
      next: (profile) => {
        this.creatorView.set(this.mapProfile(profile));
        this.currency.set((profile.currency as 'USD' | 'MXN') || 'USD');
        
        // Cargar Tiers Reales desde BD
        if (profile.tiers && profile.tiers.length > 0) {
          this.tiers.set(
            profile.tiers.map((t) => ({
              name: t.name,
              price: Number(t.monthly_price),
              description: t.description || '',
              benefits: t.benefits || [],
            }))
          );
        } else {
          this.tiers.set([]);
        }

        // Cargar Productos Digitales Reales desde BD
        if (profile.products && profile.products.length > 0) {
          this.products.set(
            profile.products.map((p) => ({
              title: p.title,
              type: p.file_type,
              price: Number(p.price),
              description: p.description || '',
            }))
          );
        } else {
          this.products.set([]);
        }

        // Cargar Supporters Reales desde BD
        if (profile.recent_supporters && profile.recent_supporters.length > 0) {
          this.supporters.set(
            profile.recent_supporters.map((s) => ({
              name: s.supporter_name,
              shakes: s.shakes_count,
              message: s.supporter_message || '¡Mucho éxito en tus metas deportivas!',
              creator_reply: s.creator_reply,
              creator_reply_at: s.creator_reply_at ? new Date(s.creator_reply_at).toLocaleDateString('es-MX') : null,
              is_liked_by_creator: s.is_liked_by_creator,
              when: new Date(s.created_at).toLocaleDateString('es-MX'),
              initials: s.supporter_name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'SP',
            }))
          );
        } else {
          this.supporters.set([]);
        }

        this.bookingServices.set(
          profile.booking_services.map((s) => ({
            id: String(s.id),
            title: s.title,
            duration: `${s.duration_minutes} min`,
            price: Number(s.price),
            description: s.description || '',
            platform: s.platform,
            category: 'Asesoría de Técnica',
          })),
        );
        this.loading.set(false);
        this.loadPosts(handle);

        // Si el usuario está autenticado, consultar si ya sigue a este atleta
        if (this.authService.isAuthenticated()) {
          this.supporterService.checkFollowStatus(handle).subscribe({
            next: (res) => this.isFollowing.set(res.following),
            error: () => this.isFollowing.set(false),
          });
        }
      },
      error: () => {
        this.error.set('No encontramos este perfil de atleta.');
        this.loading.set(false);
      },
    });
  }

  private loadPosts(handle: string): void {
    this.exploreService.getCreatorPosts(handle).subscribe({
      next: (items) => {
        const c = this.creatorView();
        if (!c) return;
        this.posts.set(
          items.map((p) => ({
            id: String(p.id),
            title: p.title,
            excerpt: p.content_html.replace(/<[^>]+>/g, '').slice(0, 180),
            authorName: c.name,
            authorHandle: c.handle,
            publishedAt: new Date(p.published_at).toLocaleDateString('es-MX'),
            likesCount: p.likes_count,
            commentsCount: p.comments?.length || 0,
            isMembersOnly: p.is_members_only,
            comments: (p.comments || []).map((cm) => ({
              id: cm.id,
              userName: cm.user_name,
              userAvatar: cm.user_avatar,
              content: cm.content,
              createdAt: new Date(cm.created_at).toLocaleDateString('es-MX'),
            })),
          })),
        );
      },
      error: () => {},
    });
  }

  private mapProfile(profile: CreatorProfile): CreatorView {
    const goalTarget = Number(profile.active_goal_target ?? 0);
    const goalRaised = Number(profile.active_goal_raised ?? 0);
    return {
      handle: profile.handle,
      name: profile.name,
      role: profile.primary_sport,
      city: profile.city || 'México',
      bio: profile.bio || 'Atleta oficial en buymeashake.fit',
      initials: profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      goalTitle: profile.active_goal_title || 'Meta deportiva activa',
      goalTarget: goalTarget || 1000,
      goalRaised: goalRaised,
      supporters: 0,
      disciplines: [profile.primary_sport],
      shakePrice: Number(profile.shake_price) || SHAKE_PRICE,
      currency: (profile.currency as 'USD' | 'MXN') || 'USD',
      coverImageUrl: profile.cover_image_url,
      avatarUrl: profile.avatar_url,
      isVerified: profile.is_verified,
    };
  }

  likePost(postId: string): void {
    const id = Number(postId);
    this.supporterService.likePost(id).subscribe({
      next: (res) => {
        this.posts.update((list) =>
          list.map((p) => (p.id === postId ? { ...p, likesCount: res.likes_count } : p)),
        );
      },
      error: () => {
        this.posts.update((list) =>
          list.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p)),
        );
      },
    });
  }

  commentOnPost(event: { postId: string; content: string }): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: window.location.pathname } });
      return;
    }

    const postId = Number(event.postId);
    this.supporterService.commentOnPost(postId, event.content).subscribe({
      next: (comment) => {
        this.posts.update((list) =>
          list.map((p) =>
            p.id === event.postId
              ? {
                  ...p,
                  commentsCount: (p.commentsCount || 0) + 1,
                  comments: [
                    ...(p.comments || []),
                    {
                      id: comment.id,
                      userName: comment.user_name,
                      userAvatar: comment.user_avatar,
                      content: comment.content,
                      createdAt: 'Justo ahora',
                    },
                  ],
                }
              : p,
          ),
        );
      },
      error: (err) => {
        console.error('Error adding comment:', err);
      },
    });
  }

  unlockPost(_post: PostItem): void {
    this.setTab('memberships');
  }

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
    const c = this.creatorView();
    if (!srv || !c) return;

    this.checkout.start({
      type: 'booking',
      title: srv.title,
      creatorName: c.name,
      creatorHandle: c.handle,
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
    const c = this.creatorView();
    if (!c) return;

    this.checkout.start({
      type: 'product',
      title: product.title,
      creatorName: c.name,
      creatorHandle: c.handle,
      shakes: 1,
      unitPrice: product.price,
      currency: this.currency(),
      message: `Compra de producto digital: ${product.title}`,
      activity: this.activity().id,
      downloadUrl: 'https://buymeashake.fit/downloads/demo.pdf',
    });
  }

  joinTier(tier: CreatorTier): void {
    const c = this.creatorView();
    if (!c) return;

    this.checkout.start({
      type: 'membership',
      title: tier.name,
      creatorName: c.name,
      creatorHandle: c.handle,
      shakes: 1,
      unitPrice: tier.price,
      currency: this.currency(),
      message: `Suscripción mensual a: ${tier.name}`,
      activity: this.activity().id,
    });
  }

  support(): void {
    const c = this.creatorView();
    if (!c) return;

    this.paymentService
      .createShakeIntent({
        athlete_handle: c.handle,
        shakes_count: this.shakes(),
        currency: this.currency(),
        supporter_message: this.message(),
      })
      .subscribe({
        next: (intent) => {
          this.checkout.start({
            type: 'shake',
            creatorName: c.name,
            creatorHandle: c.handle,
            shakes: this.shakes(),
            supporterName: this.supporterName(),
            isAnonymous: this.isAnonymous(),
            message: this.message(),
            activity: this.activity().id,
            currency: this.currency(),
            unitPrice: this.currentPrice(),
            paymentClientSecret: intent.client_secret,
            transactionUuid: intent.transaction_uuid,
          });
        },
        error: () => {
          this.checkout.start({
            type: 'shake',
            creatorName: c.name,
            creatorHandle: c.handle,
            shakes: this.shakes(),
            supporterName: this.supporterName(),
            isAnonymous: this.isAnonymous(),
            message: this.message(),
            activity: this.activity().id,
            currency: this.currency(),
            unitPrice: this.currentPrice(),
          });
        },
      });
  }
}

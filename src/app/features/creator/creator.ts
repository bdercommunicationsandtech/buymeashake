import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import { ExploreService } from '../../core/explore.service';
import { PaymentService } from '../../core/payment.service';
import { AuthService } from '../../core/auth.service';
import { SupporterService } from '../../core/supporter.service';
import {
  Activity,
  ACTIVITIES,
  QUICK_SHAKES,
  SHAKE_PRICE,
} from '../../core/demo';
import {
  AnimatedShakerComponent,
  IconBoltComponent,
  IconButtonShareComponent,
  IconButtonSupportComponent,
  IconCalendarComponent,
  IconDumbbellComponent,
  IconShakerComponent,
  IconTrophyComponent,
} from '../../shared/icons';
import { PostCardComponent, PostItem } from '../../shared/post-card/post-card.component';
import { FollowModalComponent } from '../../shared/follow-modal/follow-modal.component';
import { ShareQrModalComponent } from '../../shared/share-qr-modal/share-qr-modal.component';
import { EditSectionOverlayComponent } from '../../shared/edit-section-overlay/edit-section-overlay.component';
import { PageCopyModalComponent } from '../../shared/page-editor-modals/page-copy-modal.component';
import { AthleteProfileModalComponent } from '../../shared/page-editor-modals/athlete-profile-modal.component';
import { AgendaCopyModalComponent } from '../../shared/page-editor-modals/agenda-copy-modal.component';
import { GoalEditorModalComponent } from '../../shared/page-editor-modals/goal-editor-modal.component';
import { PricesModalComponent } from '../../shared/page-editor-modals/prices-modal.component';
import { EditorSavePatch } from '../../shared/page-editor-modals/editor-save-patch';
import { CreatorProfile } from '../../core/api.models';

export interface CreatorProduct {
  title: string;
  type: string;
  price: number;
  description: string;
}

export interface CreatorTier {
  id: number;
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
  pageTitle: string | null;
  pageDescription: string | null;
  agendaTitle: string | null;
  agendaDescription: string | null;
  agendaImageUrl: string | null;
  initials: string;
  goalTitle: string;
  goalTarget: number;
  goalRaised: number;
  goalCoverImageUrl: string | null;
  hasActiveGoal: boolean;
  supporters: number;
  shakesReceived: number;
  disciplines: string[];
  shakePrice: number;
  currency: 'USD';
  coverImageUrl: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
}

@Component({
  selector: 'app-creator',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AnimatedShakerComponent,
    IconShakerComponent,
    IconBoltComponent,
    IconTrophyComponent,
    IconButtonShareComponent,
    IconButtonSupportComponent,
    IconCalendarComponent,
    IconDumbbellComponent,
    PostCardComponent,
    FollowModalComponent,
    ShareQrModalComponent,
    EditSectionOverlayComponent,
    PageCopyModalComponent,
    AthleteProfileModalComponent,
    AgendaCopyModalComponent,
    GoalEditorModalComponent,
    PricesModalComponent,
  ],
  templateUrl: './creator.html',
})
export class Creator {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutService);
  private readonly exploreService = inject(ExploreService);
  private readonly paymentService = inject(PaymentService);
  private readonly authService = inject(AuthService);
  private readonly supporterService = inject(SupporterService);

  readonly username = input.required<string>();
  readonly editMode = input(false);

  readonly creatorView = signal<CreatorView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly supporters = signal<any[]>([]);
  readonly quickShakes = QUICK_SHAKES;

  /** true mientras se crea la sesión y se redirige a Stripe Checkout */
  readonly openingStripe = signal(false);
  readonly openingStripeTierId = signal<number | null>(null);

  readonly editorModal = signal<
    'hero' | 'profile' | 'agenda' | 'goal' | 'prices' | null
  >(null);

  readonly followModalOpen = signal(false);
  readonly shareModalOpen = signal(false);
  readonly isFollowing = signal(false);
  readonly isTogglingFollow = signal(false);

  readonly supportMode = signal<'once' | 'recurring'>('once');
  readonly showBookingPanel = signal(false);
  readonly posts = signal<PostItem[]>([]);

  readonly bookingServices = signal<CreatorBookingService[]>([]);
  readonly products = signal<CreatorProduct[]>([]);
  readonly tiers = signal<CreatorTier[]>([]);

  readonly shakes = signal(3);
  readonly supporterName = signal('');
  readonly isAnonymous = signal(false);
  readonly message = signal('');
  readonly activity = signal<Activity>(ACTIVITIES[0]);
  readonly currency = signal<'USD'>('USD');

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

  readonly pageTitleLines = computed(() => {
    const raw = this.creatorView()?.pageTitle?.trim();
    if (raw) {
      return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    }
    return ['Fuerza', 'Disciplina', 'Propósito'];
  });

  readonly pageDescriptionText = computed(() => {
    const c = this.creatorView();
    return c?.pageDescription?.trim() || c?.bio || '';
  });

  readonly agendaTitleText = computed(
    () => this.creatorView()?.agendaTitle?.trim() || 'Entrena, mejora y alcanza tus metas',
  );

  readonly agendaDescriptionText = computed(
    () =>
      this.creatorView()?.agendaDescription?.trim() ||
      'Sesiones 1 a 1 para técnica, consultoría y seguimiento personalizado.',
  );

  /** Hay agenda usable si el atleta publicó al menos un servicio de booking. */
  readonly hasAgendaAvailable = computed(() => this.bookingServices().length > 0);

  readonly hasActiveGoal = computed(() => Boolean(this.creatorView()?.hasActiveGoal));

  readonly agendaImageStyle = computed(() => {
    const url = this.creatorView()?.agendaImageUrl;
    if (url) return `url('${url}')`;
    return "url('https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1200&auto=format&fit=crop')";
  });

  readonly coverStyle = computed(() => {
    const url = this.creatorView()?.coverImageUrl;
    if (url) {
      return `url('${url}')`;
    }
    return "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop')";
  });

  readonly shakePrice = computed(() => this.creatorView()?.shakePrice ?? SHAKE_PRICE);

  readonly currentPrice = computed(() => this.shakePrice());

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
            this.creatorView.update((c) =>
              c ? { ...c, supporters: Math.max(0, c.supporters - 1) } : c,
            );
            this.isTogglingFollow.set(false);
          },
          error: () => this.isTogglingFollow.set(false),
        });
      } else {
        this.supporterService.followAthlete(handle).subscribe({
          next: () => {
            this.isFollowing.set(true);
            this.creatorView.update((c) => (c ? { ...c, supporters: c.supporters + 1 } : c));
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
    this.creatorView.update((c) => (c ? { ...c, supporters: c.supporters + 1 } : c));
    // Redirige al portal del supporter (studio.buymeacoffee.com/home style)
    this.router.navigate(['/fan/home'], {
      queryParams: { followed: this.creatorView()?.handle || this.username() },
    });
  }

  sharePage(): void {
    const handle = this.creatorView()?.handle || this.username();
    const url = `https://buymeashake.fit/${handle}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    this.shareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.shareModalOpen.set(false);
  }

  constructor() {
    effect(() => {
      const handle = this.username();
      if (handle) {
        this.loadCreator(handle);
      }
    });

    // Escucha en tiempo real si el supporter completó una donación
    // (retorno Stripe lo maneja App al boot para mostrar overlay al instante)
    effect(() => {
      const last = this.checkout.lastDonation();
      if (last) {
        if (last.newGoalRaised !== undefined && last.newGoalRaised !== null) {
          this.creatorView.update((c) => (c ? { ...c, goalRaised: last.newGoalRaised! } : c));
        }
        if (last.supporterItem) {
          const s = last.supporterItem;
          const shakesAdded = Number(s.shake_details?.shakes_count ?? 0);
          const initials = s.supporter_name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'SP';

          this.supporters.update((list) => [
            {
              name: s.supporter_name,
              shakes: shakesAdded,
              message: s.shake_details?.supporter_message || '¡Mucho éxito con tu entrenamiento!',
              when: 'Justo ahora',
              initials: initials,
            },
            ...list,
          ]);

          if (shakesAdded > 0) {
            this.creatorView.update((c) =>
              c ? { ...c, shakesReceived: c.shakesReceived + shakesAdded } : c,
            );
          }
        }
      }
    });
  }

  scrollToSupport(mode: 'once' | 'recurring' = 'once'): void {
    this.supportMode.set(mode);
    this.scrollToId('support');
  }

  scrollToAgenda(): void {
    this.showBookingPanel.set(false);
    this.bookingStep.set('select-service');
    this.scrollToId('agenda');
  }

  setSupportMode(mode: 'once' | 'recurring'): void {
    this.supportMode.set(mode);
  }

  openEditor(kind: 'hero' | 'profile' | 'agenda' | 'goal' | 'prices'): void {
    this.editorModal.set(kind);
  }

  closeEditor(): void {
    this.editorModal.set(null);
  }

  onEditorSaved(patch: EditorSavePatch): void {
    this.editorModal.set(null);
    this.applyEditorPatch(patch);
    const handle = this.username() || this.creatorView()?.handle;
    if (handle) this.loadCreator(handle, true, patch);
  }

  private applyEditorPatch(patch: EditorSavePatch): void {
    this.creatorView.update((current) => {
      if (!current) return current;
      const initials = patch.name
        ? patch.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : current.initials;
      return {
        ...current,
        pageTitle: patch.pageTitle !== undefined ? patch.pageTitle : current.pageTitle,
        pageDescription:
          patch.pageDescription !== undefined ? patch.pageDescription : current.pageDescription,
        agendaTitle: patch.agendaTitle !== undefined ? patch.agendaTitle : current.agendaTitle,
        agendaDescription:
          patch.agendaDescription !== undefined ? patch.agendaDescription : current.agendaDescription,
        agendaImageUrl:
          patch.agendaImageUrl !== undefined ? patch.agendaImageUrl : current.agendaImageUrl,
        goalTitle: patch.goalTitle ?? current.goalTitle,
        goalTarget: patch.goalTarget ?? current.goalTarget,
        goalRaised: patch.goalRaised ?? current.goalRaised,
        goalCoverImageUrl:
          patch.goalCoverImageUrl !== undefined ? patch.goalCoverImageUrl : current.goalCoverImageUrl,
        hasActiveGoal:
          patch.goalTitle !== undefined
            ? Boolean(patch.goalTitle?.trim())
            : patch.goalTarget !== undefined
              ? Number(patch.goalTarget) > 0 || current.hasActiveGoal
              : current.hasActiveGoal,
        shakePrice: patch.shakePrice ?? current.shakePrice,
        name: patch.name ?? current.name,
        bio: patch.bio ?? current.bio,
        city: patch.city ?? current.city,
        coverImageUrl:
          patch.coverImageUrl !== undefined ? patch.coverImageUrl : current.coverImageUrl,
        avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatarUrl,
        instagramUrl:
          patch.instagramUrl !== undefined ? patch.instagramUrl : current.instagramUrl,
        tiktokUrl: patch.tiktokUrl !== undefined ? patch.tiktokUrl : current.tiktokUrl,
        facebookUrl:
          patch.facebookUrl !== undefined ? patch.facebookUrl : current.facebookUrl,
        twitterUrl: patch.twitterUrl !== undefined ? patch.twitterUrl : current.twitterUrl,
        initials,
      };
    });
  }

  private scrollToId(id: string): void {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private loadSeq = 0;

  private loadCreator(handle: string, silent = false, keepPatch?: EditorSavePatch): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(null);
    const seq = ++this.loadSeq;

    this.exploreService.getCreatorProfile(handle).subscribe({
      next: (profile) => {
        if (seq !== this.loadSeq) return;
        this.creatorView.set(this.mapProfile(profile));
        if (keepPatch) {
          this.applyEditorPatch(keepPatch);
        }
        this.currency.set('USD');
        
        // Cargar Tiers Reales desde BD
        if (profile.tiers && profile.tiers.length > 0) {
          this.tiers.set(
            profile.tiers.map((t) => ({
              id: t.id,
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
              shakes: s.shake_details?.shakes_count ?? 0,
              message: s.shake_details?.supporter_message || '¡Mucho éxito en tus metas deportivas!',
              creator_reply: s.shake_details?.creator_reply,
              creator_reply_at: s.shake_details?.creator_reply_at
                ? new Date(s.shake_details.creator_reply_at).toLocaleDateString('es-MX')
                : null,
              is_liked_by_creator: s.shake_details?.is_liked_by_creator,
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
          (profile.booking_services || []).map((s) => ({
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

        if (this.authService.isAuthenticated()) {
          this.supporterService.checkFollowStatus(handle).subscribe({
            next: (res) => this.isFollowing.set(res.following),
            error: () => this.isFollowing.set(false),
          });
        }
      },
      error: () => {
        if (seq !== this.loadSeq) return;
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
          items.map((p) => {
            const htmlMatch = p.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
            const mdMatch = p.content_html.match(/!\[[^\]]*]\(([^)\s]+)\)/);
            const coverImageUrl = htmlMatch?.[1] || mdMatch?.[1] || null;
            return {
              id: String(p.id),
              title: p.title,
              excerpt: p.content_html.replace(/<[^>]+>/g, '').replace(/!\[[^\]]*]\([^)]*\)/g, '').slice(0, 180),
              content: p.content_html,
              authorName: c.name,
              authorHandle: c.handle,
              authorAvatar: c.avatarUrl,
              publishedAt: new Date(p.published_at).toLocaleDateString('es-MX'),
              likesCount: p.likes_count,
              commentsCount: p.comments?.length || 0,
              isMembersOnly: p.is_members_only,
              coverImageUrl,
              comments: (p.comments || []).map((cm) => ({
                id: cm.id,
                userName: cm.user_name,
                userAvatar: cm.user_avatar,
                content: cm.content,
                createdAt: new Date(cm.created_at).toLocaleDateString('es-MX'),
              })),
            };
          }),
        );
      },
      error: () => {},
    });
  }

  private mapProfile(profile: CreatorProfile): CreatorView {
    const goalTarget = Number(profile.active_goal_target ?? 0);
    const goalRaised = Number(profile.active_goal_raised ?? 0);
    const shakesReceived = Number(profile.total_shakes_received ?? 0);
    const followersCount = Number(profile.followers_count ?? 0);

    return {
      handle: profile.handle,
      name: profile.name,
      role: profile.primary_sport,
      city: profile.city || 'México',
      bio: profile.bio || 'Atleta oficial en buymeashake.fit',
      pageTitle: profile.page_title ?? null,
      pageDescription: profile.page_description ?? null,
      agendaTitle: profile.agenda_title ?? null,
      agendaDescription: profile.agenda_description ?? null,
      agendaImageUrl: profile.agenda_image_url ?? null,
      initials: profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      goalTitle: profile.active_goal_title || '',
      goalTarget: goalTarget,
      goalRaised: goalRaised,
      goalCoverImageUrl: profile.active_goal_cover_image_url ?? null,
      hasActiveGoal: Boolean(profile.active_goal_title),
      supporters: followersCount,
      shakesReceived,
      disciplines: [profile.primary_sport],
      shakePrice: Number(profile.shake_price) || SHAKE_PRICE,
      currency: 'USD',
      coverImageUrl: profile.cover_image_url,
      avatarUrl: profile.avatar_url,
      isVerified: profile.is_verified,
      instagramUrl: profile.instagram_url,
      tiktokUrl: profile.tiktok_url,
      facebookUrl: profile.facebook_url,
      twitterUrl: profile.twitter_url,
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
    this.scrollToSupport('recurring');
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

  selectServiceToBook(service: CreatorBookingService): void {
    this.selectedService.set(service);
    this.bookingStep.set('select-time');
    this.showBookingPanel.set(true);
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
    this.showBookingPanel.set(false);
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

  joinTier(tier: CreatorTier): void {
    const c = this.creatorView();
    if (!c || this.openingStripe()) return;

    this.openingStripe.set(true);
    this.openingStripeTierId.set(tier.id);

    this.paymentService
      .createSubscriptionCheckoutSession({
        tier_id: tier.id,
      })
      .subscribe({
        next: (sessionRes) => {
          if (sessionRes.checkout_url && sessionRes.checkout_url.startsWith('https://checkout.stripe.com')) {
            window.location.href = sessionRes.checkout_url;
            return;
          }
          this.openingStripe.set(false);
          this.openingStripeTierId.set(null);
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
            tierId: tier.id,
          });
        },
        error: () => {
          this.openingStripe.set(false);
          this.openingStripeTierId.set(null);
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
            tierId: tier.id,
          });
        },
      });
  }

  support(): void {
    const c = this.creatorView();
    if (!c || this.openingStripe()) return;

    this.openingStripe.set(true);

    this.paymentService
      .createStripeCheckoutSession({
        athlete_handle: c.handle,
        currency: this.currency(),
        supporter_name: this.isAnonymous() ? 'Alguien anónimo' : (this.supporterName() || 'Un Fan'),
        shake_details: {
          shakes_count: this.shakes(),
          supporter_message: this.message(),
          is_anonymous: this.isAnonymous(),
        },
      })
      .subscribe({
        next: (sessionRes) => {
          if (sessionRes.checkout_url && sessionRes.checkout_url.startsWith('https://checkout.stripe.com')) {
            window.location.href = sessionRes.checkout_url;
            return;
          }
          this.openingStripe.set(false);
          // Fallback a modal local solo si estamos en modo simulador sin keys
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
        error: () => {
          this.openingStripe.set(false);
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

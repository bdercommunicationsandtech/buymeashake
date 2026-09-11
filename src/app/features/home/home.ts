import {
  Component,
  computed,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckoutService } from '../../core/checkout.service';
import { LookupService } from '../../core/lookup.service';
import { ExploreService } from '../../core/explore.service';
import { LookupItemDto, AthleteLeaderboardItem } from '../../core/api.models';
import { LanguageService } from '../../core/language.service';
import { SHAKE_PRICE } from '../../core/demo';
import { BannerService } from '../../core/banner.service';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

import { IconShakerComponent } from '../../shared/icons/icon-shaker';
import { DisciplineIconComponent } from '../../shared/icons/discipline-icon';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

export interface DisciplineCarouselItem {
  id: string;
  name: string;
  tag: string;
  iconUrl: string | null;
  image: string;
  exploreCat: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconShakerComponent,
    DisciplineIconComponent,
    MediaUrlPipe,
  ],
  templateUrl: './home.html',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutService);
  readonly languageService = inject(LanguageService);
  private readonly lookupService = inject(LookupService);
  private readonly exploreService = inject(ExploreService);
  private readonly bannerService = inject(BannerService);

  readonly t = this.languageService.t;
  readonly shakePrice = SHAKE_PRICE;
  readonly shakesCount = signal(3);
  readonly supportMessage = signal('');
  readonly disciplines = signal<LookupItemDto[]>([]);

  // Hero section background image rotation (synchronized with Admin Panel)
  readonly heroImages = this.bannerService.heroImages;
  readonly currentHeroIndex = signal<number>(0);
  private heroImageTimer: any = null;

  readonly coverflowDisciplines = signal<DisciplineCarouselItem[]>([]);

  // Estado del Carrusel 3D Coverflow
  readonly activeDisciplineIndex = signal<number>(0);
  readonly isAutoPlaying = signal<boolean>(true);
  private autoplayTimer: any = null;

  // Touch / pointer gesture state
  private startX = 0;
  private isPointerDown = false;

  // GSAP context para limpieza segura sin fugas de memoria
  private gsapContext: gsap.Context | null = null;

  // Atletas en vivo desde la base de datos con fallback idéntico a las referencias
  readonly liveAthletes = signal<AthleteLeaderboardItem[]>([]);
  readonly topLeaders = computed(() => {
    const list = this.liveAthletes();
    if (!list || list.length === 0) {
      return [
        {
          rank: 1,
          name: 'Ángel Fit',
          handle: 'angelfit',
          sport: 'Fuerza & Levantamiento',
          shakes: 8,
          totalRaised: 40,
          initials: 'AR',
          avatarUrl: null,
        },
        {
          rank: 2,
          name: 'Héctor Pérez',
          handle: 'hepet32',
          sport: 'Running & Atletismo, Surf, Waterpolo',
          shakes: 0,
          totalRaised: 0,
          initials: 'H',
          avatarUrl: null,
        },
        {
          rank: 3,
          name: 'Diego Ibarra',
          handle: 'despapaye_ibarra',
          sport: 'Ciclismo & Ruta, CrossFit & Funciona...',
          shakes: 0,
          totalRaised: 0,
          initials: 'DI',
          avatarUrl: null,
        },
      ];
    }
    return list.map((a, i) => ({
      rank: i + 1,
      name: a.athlete_name,
      handle: a.handle,
      sport: a.disciplines?.map(d => this.languageService.translateDiscipline(d)).join(', ') || 'Atleta de Alto Rendimiento',
      shakes: a.total_shakes_this_month,
      totalRaised: a.total_raised_this_month,
      initials: a.athlete_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AT',
      avatarUrl: resolveMediaUrl(a.avatar_url),
    }));
  });

  readonly leader1 = computed(() => this.topLeaders().find(l => l.rank === 1) || this.topLeaders()[0]);
  readonly leader2 = computed(() => this.topLeaders().find(l => l.rank === 2) || this.topLeaders()[1]);
  readonly leader3 = computed(() => this.topLeaders().find(l => l.rank === 3) || this.topLeaders()[2]);

  // Estado de viewport móvil para degradar el coverflow a slider 2D plano sin 3D forzado
  readonly isMobileViewport = signal<boolean>(false);
  readonly prefersReducedMotion = signal<boolean>(false);
  readonly isFlatSlider = computed(() => this.isMobileViewport() || this.prefersReducedMotion());
  private resizeListener: (() => void) | null = null;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initAnimations();
    }
  }

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => this.disciplines.set(items),
    });

    this.lookupService.getDisciplines(true).subscribe({
      next: (items) => {
        const fallbackImage =
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop';
        const mapped: DisciplineCarouselItem[] = items.slice(0, 10).map((d) => ({
          id: String(d.id),
          name: d.name,
          tag: d.description || '',
          iconUrl: d.icon_url,
          image: resolveMediaUrl(d.image_url) || d.image_url || fallbackImage,
          exploreCat: d.name,
        }));
        this.coverflowDisciplines.set(mapped);
        const crossIdx = mapped.findIndex((d) => /cross/i.test(d.name));
        this.activeDisciplineIndex.set(crossIdx >= 0 ? crossIdx : 0);
      },
    });

    this.exploreService.getMonthlyLeaderboard(3).subscribe({
      next: (athletes) => {
        if (athletes && athletes.length > 0) {
          this.liveAthletes.set(athletes);
        }
      },
    });

    if (isPlatformBrowser(this.platformId)) {
      this.checkViewport();
      this.resizeListener = () => this.checkViewport();
      window.addEventListener('resize', this.resizeListener, { passive: true });
      this.startAutoplay();
      this.startHeroRotation();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.stopHeroRotation();
    if (this.gsapContext) {
      this.gsapContext.revert();
    }
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }

  startHeroRotation(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.heroImageTimer = setInterval(() => {
        const count = this.heroImages().length;
        if (count > 1) {
          this.currentHeroIndex.update((i) => (i + 1) % count);
        }
      }, 6000);
    }
  }

  stopHeroRotation(): void {
    if (this.heroImageTimer) {
      clearInterval(this.heroImageTimer);
      this.heroImageTimer = null;
    }
  }

  private checkViewport(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobileViewport.set(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
      const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      this.prefersReducedMotion.set(
        hasMatchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
      );
    }
  }

  // Métodos de control del Carrusel Coverflow
  selectDiscipline(index: number): void {
    const list = this.coverflowDisciplines();
    if (!list.length) return;
    this.activeDisciplineIndex.set(index);
    this.trackEvent('carousel_discipline_select', {
      discipline: list[index]?.name,
      index,
    });
  }

  /** Click en una tarjeta del carrusel → Explore filtrado por esa disciplina. */
  onDisciplineCardClick(index: number): void {
    const list = this.coverflowDisciplines();
    const d = list[index];
    if (!d) return;

    this.selectDiscipline(index);
    this.trackEvent('carousel_discipline_explore', {
      discipline: d.name,
      index,
    });
    void this.router.navigate(['/explore'], {
      queryParams: { cat: d.exploreCat },
    });
  }

  openDisciplineExplore(d: DisciplineCarouselItem, event?: Event): void {
    event?.stopPropagation();
    this.trackEvent('carousel_discipline_explore', { discipline: d.name });
    void this.router.navigate(['/explore'], {
      queryParams: { cat: d.exploreCat },
    });
  }

  nextDiscipline(): void {
    const total = this.coverflowDisciplines().length;
    if (!total) return;
    const nextIdx = (this.activeDisciplineIndex() + 1) % total;
    this.selectDiscipline(nextIdx);
  }

  prevDiscipline(): void {
    const total = this.coverflowDisciplines().length;
    if (!total) return;
    const prevIdx = (this.activeDisciplineIndex() - 1 + total) % total;
    this.selectDiscipline(prevIdx);
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      if (this.isAutoPlaying()) {
        this.nextDiscipline();
      }
    }, 4500);
  }

  stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  onMouseEnterCarousel(): void {
    this.isAutoPlaying.set(false);
  }

  onMouseLeaveCarousel(): void {
    this.isAutoPlaying.set(true);
  }

  // Gestos táctiles y arrastre de mouse
  onPointerDown(e: PointerEvent): void {
    this.isPointerDown = true;
    this.startX = e.clientX;
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    const diff = e.clientX - this.startX;
    const threshold = 40;
    if (diff > threshold) {
      this.prevDiscipline();
    } else if (diff < -threshold) {
      this.nextDiscipline();
    }
  }

  // Telemetría y Analítica de eventos de conversión
  trackEvent(eventName: string, metadata?: Record<string, any>): void {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({ event: eventName, ...metadata });
      }
      console.debug(`[Analytics Event] ${eventName}`, metadata);
    }
  }

  // Animaciones GSAP con ScrollTrigger y respeto a prefers-reduced-motion
  private initAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    gsap.registerPlugin(ScrollTrigger);

    const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    const prefersReducedMotion = hasMatchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    this.gsapContext = gsap.context(() => {
      // Hero elements entrance
      gsap.fromTo(
        '.hero-anim-item',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      );

      // Ranking podium cards entrance
      const rankingCards = gsap.utils.toArray<HTMLElement>('.ranking-card');
      if (rankingCards.length) {
        gsap.fromTo(
          rankingCards,
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.65,
            stagger: 0.12,
            ease: 'back.out(1.2)',
            clearProps: 'opacity,transform',
            scrollTrigger: {
              trigger: '#ranking-section',
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // 3 Steps storytelling timeline
      const stepCards = gsap.utils.toArray<HTMLElement>('.step-card');
      if (stepCards.length) {
        gsap.fromTo(
          stepCards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
            scrollTrigger: {
              trigger: '#steps-section',
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // Bento cards reveal
      const bentoCards = gsap.utils.toArray<HTMLElement>('.bento-card');
      if (bentoCards.length) {
        gsap.fromTo(
          bentoCards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
            scrollTrigger: {
              trigger: '#bento-section',
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // Final CTA banner subtle pop
      const ctaBanner = document.querySelector<HTMLElement>('.cta-banner-container');
      if (ctaBanner) {
        gsap.fromTo(
          ctaBanner,
          { scale: 0.96, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.7,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
            scrollTrigger: {
              trigger: ctaBanner,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // Refresh ScrollTrigger positions cleanly after initial frame
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    });
  }

  setShakes(n: number): void {
    this.shakesCount.set(n);
  }

  supportDemo(): void {
    const isEn = this.languageService.lang() === 'en';
    this.checkout.start({
      creatorName: 'Sofía Ramírez',
      creatorHandle: 'sofifit',
      shakes: this.shakesCount(),
      message:
        this.supportMessage().trim() ||
        (isEn ? 'Best of luck with your training!' : '¡Mucho éxito en tus entrenamientos!'),
      currency: 'USD',
      unitPrice: this.shakePrice,
    });
  }
}

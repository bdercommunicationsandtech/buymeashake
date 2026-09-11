import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExploreService } from '../../core/explore.service';
import { LookupService } from '../../core/lookup.service';
import { LanguageService } from '../../core/language.service';
import { IconShakerComponent } from '../../shared/icons/icon-shaker';
import { AthleteLeaderboardItem } from '../../core/api.models';
import { AllowedUserTextDirective } from '../../core/directives/allowed-user-text.directive';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

export interface AthleteProfile {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarUrl: string | null;
  sport: string;
  disciplines?: string[];
  bio: string;
  shakesThisMonth: number;
  totalRaised: number;
  rank?: number;
  avatarBg?: string;
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'y')
    .trim();
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, IconShakerComponent, AllowedUserTextDirective],
  templateUrl: './explore.html',
})
export class Explore implements OnInit, AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly exploreService = inject(ExploreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lookupService = inject(LookupService);
  readonly languageService = inject(LanguageService);

  readonly t = this.languageService.t;

  readonly selectedCategory = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly leaderboardLoading = signal(false);
  readonly athletesLoading = signal(false);

  readonly categories = signal<string[]>(['ALL']);

  readonly leaderboardAthletes = signal<AthleteProfile[]>([]);
  readonly exploreAthletes = signal<AthleteProfile[]>([]);

  // Fallback reactivo de avatares rotos
  readonly avatarErrors = signal<Set<string>>(new Set());

  // Referencia al contenedor horizontal de tarjetas 4-10
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLElement>;

  private gsapContext?: gsap.Context;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['cat']) {
        this.selectedCategory.set(params['cat']);
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.scrollToFilteredAthletes(), 120);
        }
      }
      if (params['q']) this.searchQuery.set(params['q']);
    });
    this.loadDisciplines();

    this.fetchLeaderboard();
    this.fetchAthletes();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initAnimations();
    }
  }

  ngOnDestroy(): void {
    if (this.gsapContext) {
      this.gsapContext.revert();
    }
  }

  loadDisciplines(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        const labels = items.map((i) => i.label);
        this.categories.set(['ALL', ...labels]);
      },
      error: () => {},
    });
  }

  fetchLeaderboard(): void {
    this.leaderboardLoading.set(true);
    this.exploreService.getMonthlyLeaderboard(10).subscribe({
      next: (items) => {
        this.leaderboardLoading.set(false);
        if (!items?.length) return;

        // Fix de orden: asegurar orden ascendente estricto por ranking_position
        const sorted = [...items].sort(
          (a, b) => (a.ranking_position ?? 0) - (b.ranking_position ?? 0)
        );
        const mapped: AthleteProfile[] = sorted.map((it) => this.mapToProfile(it));
        this.leaderboardAthletes.set(mapped);

        // Disparar micro-animación al cargar datos en el browser
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.initAnimations(), 50);
        }
      },
      error: () => {
        this.leaderboardLoading.set(false);
      },
    });
  }

  fetchAthletes(): void {
    this.athletesLoading.set(true);
    this.exploreService.getAthletes({ limit: 100 }).subscribe({
      next: (items) => {
        this.athletesLoading.set(false);
        if (!items?.length) return;

        const mapped: AthleteProfile[] = items.map((it) => this.mapToProfile(it));
        this.exploreAthletes.set(mapped);
      },
      error: () => {
        this.athletesLoading.set(false);
      },
    });
  }

  private mapToProfile(it: AthleteLeaderboardItem): AthleteProfile {
    const names = it.athlete_name.trim().split(/\s+/);
    const initials =
      names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : it.athlete_name.slice(0, 2).toUpperCase();

    return {
      id: String(it.athlete_id),
      name: it.athlete_name,
      handle: it.handle,
      initials,
      avatarUrl: resolveMediaUrl(it.avatar_url),
      sport: it.disciplines?.join(', ') || 'Deporte General',
      disciplines: it.disciplines && it.disciplines.length > 0 ? it.disciplines : [it.disciplines?.join(', ') || 'Deporte General'],
      bio: it.bio || 'Atleta oficial en buymeashake.fit',
      shakesThisMonth: it.total_shakes_this_month,
      totalRaised: Number(it.total_raised_this_month),
      rank: it.ranking_position,
      avatarBg:
        it.ranking_position === 1
          ? 'bg-amber-500'
          : it.ranking_position === 2
            ? 'bg-slate-400'
            : 'bg-amber-700',
    };
  }

  // Fallback de avatar cuando la URL falla
  onAvatarError(athleteId: string): void {
    this.avatarErrors.update((prev) => {
      const next = new Set(prev);
      next.add(athleteId);
      return next;
    });
  }

  // Top 3 del podio defensivos
  readonly leader1 = computed(() =>
    this.leaderboardAthletes().find((l) => l.rank === 1) || this.leaderboardAthletes()[0]
  );
  readonly leader2 = computed(() =>
    this.leaderboardAthletes().find((l) => l.rank === 2) || this.leaderboardAthletes()[1]
  );
  readonly leader3 = computed(() =>
    this.leaderboardAthletes().find((l) => l.rank === 3) || this.leaderboardAthletes()[2]
  );

  readonly topPodium = computed(() => this.leaderboardAthletes().slice(0, 3));

  // Puestos del 4 al 10 en orden numérico estricto
  readonly topRemaining = computed(() => this.leaderboardAthletes().slice(3, 10));

  readonly filteredAthletes = computed(() => {
    const category = this.selectedCategory();
    const query = normalizeText(this.searchQuery());

    const sourceAthletes =
      this.exploreAthletes().length > 0
        ? this.exploreAthletes()
        : this.leaderboardAthletes();

    return sourceAthletes.filter((athlete) => {
      const athleteSportNorm = normalizeText(athlete.sport);
      const catNorm = normalizeText(category);
      const translatedCatNorm = normalizeText(
        this.languageService.translateDiscipline(category)
      );
      const disciplineNorms = this.getDisciplinesList(athlete).map((d) =>
        normalizeText(this.languageService.translateDiscipline(d)),
      );

      const matchesCategory =
        category === 'ALL' ||
        category === 'Todos' ||
        category === 'All' ||
        athleteSportNorm.includes(catNorm) ||
        catNorm.includes(athleteSportNorm) ||
        athleteSportNorm.includes(translatedCatNorm) ||
        translatedCatNorm.includes(athleteSportNorm) ||
        disciplineNorms.some(
          (d) =>
            d.includes(catNorm) ||
            catNorm.includes(d) ||
            d.includes(translatedCatNorm) ||
            this.disciplineTokensOverlap(d, catNorm) ||
            this.disciplineTokensOverlap(d, translatedCatNorm),
        ) ||
        this.disciplineTokensOverlap(athleteSportNorm, catNorm) ||
        this.disciplineTokensOverlap(athleteSportNorm, translatedCatNorm);

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const athleteNameNorm = normalizeText(athlete.name);
      const athleteHandleNorm = normalizeText(athlete.handle);
      const athleteBioNorm = normalizeText(athlete.bio);

      return (
        athleteNameNorm.includes(query) ||
        athleteHandleNorm.includes(query) ||
        athleteSportNorm.includes(query) ||
        athleteBioNorm.includes(query)
      );
    });
  });

  setCategory(category: string): void {
    this.selectedCategory.set(category);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        cat: category === 'ALL' || category === 'Todos' || category === 'All' ? null : category,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (category !== 'ALL' && category !== 'Todos' && category !== 'All') {
      setTimeout(() => this.scrollToFilteredAthletes(), 80);
    }
  }

  /** Match "Fuerza & Gym" ↔ "Fuerza & Levantamiento" via shared meaningful tokens. */
  private disciplineTokensOverlap(a: string, b: string): boolean {
    const stop = new Set(['y', 'and', 'de', 'del', 'la', 'el', 'los', 'las', 'the']);
    const tokens = (s: string) =>
      s
        .split(/[^a-z0-9]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 4 && !stop.has(t));
    const left = tokens(a);
    const right = tokens(b);
    if (!left.length || !right.length) return false;
    return left.some((t) => right.some((u) => t.includes(u) || u.includes(t)));
  }

  private scrollToFilteredAthletes(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = document.getElementById('explore-filtered-athletes');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  // Controles de desplazamiento del carrusel (cálculo de offset dinámico)
  scrollCarousel(direction: 'left' | 'right'): void {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 16 : 256;
    track.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  }

  // Obtener lista limpia de disciplinas para renderizar como píldoras
  getDisciplinesList(athlete: AthleteProfile): string[] {
    if (athlete.disciplines && athlete.disciplines.length > 0) {
      return athlete.disciplines;
    }
    if (athlete.sport) {
      return athlete.sport.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['Deporte General'];
  }

  // Tipografía adaptativa para evitar cortes de nombres largos
  getHandleClass(handle: string): string {
    return handle.length > 13 ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
  }

  // Animaciones GSAP con respeto a prefers-reduced-motion
  private initAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    gsap.registerPlugin(ScrollTrigger);

    const hasMatchMedia =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    const prefersReducedMotion =
      hasMatchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    if (this.gsapContext) {
      this.gsapContext.revert();
    }

    this.gsapContext = gsap.context(() => {
      // Entrada del podio Top 3
      const podiumCards = gsap.utils.toArray<HTMLElement>('.podium-card');
      if (podiumCards.length) {
        gsap.fromTo(
          podiumCards,
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.65,
            stagger: 0.12,
            ease: 'back.out(1.2)',
            clearProps: 'opacity,transform',
          }
        );
      }

      // Entrada secuencial de las tarjetas 4-10
      const carouselItems = gsap.utils.toArray<HTMLElement>('.carousel-card-item');
      if (carouselItems.length) {
        gsap.fromTo(
          carouselItems,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
          }
        );
      }
    });
  }
}

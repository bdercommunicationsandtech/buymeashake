import { Component, computed, inject, OnInit, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import { LookupService } from '../../core/lookup.service';
import { ExploreService } from '../../core/explore.service';
import { LookupItemDto, AthleteLeaderboardItem } from '../../core/api.models';
import { LanguageService } from '../../core/language.service';
import { SHAKE_PRICE } from '../../core/demo';
import {
  AnimatedShakerComponent,
  IconButtonShareComponent,
  IconButtonSupportComponent,
  IconDumbbellComponent,
  IconCalendarComponent,
  IconShakerComponent,
  IconStarComponent,
} from '../../shared/icons';
import { AllowedUserTextDirective } from '../../core/directives/allowed-user-text.directive';

export interface FloatingAthlete {
  name: string;
  discipline: string;
  supporters: number;
  initials: string;
  handle: string;
  avatarUrl: string | null;
  bg: string;
  side: 'left' | 'right';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconShakerComponent,
    IconDumbbellComponent,
    IconCalendarComponent,
    IconButtonShareComponent,
    IconButtonSupportComponent,
    IconStarComponent,
    AnimatedShakerComponent,
    AllowedUserTextDirective,
  ],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  private intervalId: any;
  private platformId = inject(PLATFORM_ID);
  private readonly checkout = inject(CheckoutService);
  readonly languageService = inject(LanguageService);
  private readonly lookupService = inject(LookupService);
  private readonly exploreService = inject(ExploreService);

  readonly t = this.languageService.t;

  readonly shakePrice = SHAKE_PRICE;
  readonly shakesCount = signal(3);
  readonly supportMessage = signal('');
  readonly disciplines = signal<LookupItemDto[]>([]);

  readonly featuredDisciplines = [
    { name: 'Fuerza & Levantamiento', tag: 'Power & Gym', icon: 'dumbbell' },
    { name: 'Running & Atletismo', tag: 'Pista & Maratón', icon: 'runner' },
    { name: 'Ciclismo & Ruta', tag: 'Ruta, Gravel & MTB', icon: 'cycling' },
    { name: 'Deportes Acuáticos', tag: 'Natación & Surf', icon: 'swimmer' },
    { name: 'Fútbol & Derivados', tag: 'Soccer, Futsal & 7', icon: 'soccer' },
    { name: 'Artes Marciales & Boxeo', tag: 'Boxeo, MMA & BJJ', icon: 'boxing' },
    { name: 'CrossFit & Funcional', tag: 'WODs & Calistenia', icon: 'crossfit' },
    { name: 'Básquetbol', tag: 'Baloncesto & 3x3', icon: 'basketball' },
    { name: 'Deportes de Raqueta', tag: 'Tenis, Pádel & Squash', icon: 'racket' },
    { name: 'Gimnasia & Acrobacia', tag: 'Artística & Parkour', icon: 'gymnastics' },
    { name: 'Deportes Extremos', tag: 'Skate, BMX & Escalada', icon: 'extreme' },
    { name: 'Yoga & Pilates', tag: 'Flexibilidad & Core', icon: 'yoga' },
    { name: 'Deportes de Motor', tag: 'Karting, Moto & Rally', icon: 'motor' },
    { name: 'Esports & Gaming', tag: 'Competitivo & Sim', icon: 'gaming' },
  ];

  readonly liveAthletes = signal<AthleteLeaderboardItem[]>([]);
  readonly heroImages = [
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2000&auto=format&fit=crop'
  ];
  readonly currentHeroImageIndex = signal(0);


  readonly leftAthletes = computed<FloatingAthlete[]>(() => {
    return this.liveAthletes().map((a, i) => ({
      name: a.athlete_name,
      discipline: a.disciplines?.map(d => this.languageService.translateDiscipline(d)).join(', '),
      supporters: a.total_shakes_this_month,
      initials: a.athlete_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      handle: a.handle,
      avatarUrl: a.avatar_url,
      bg: ['bg-[#090c0d]', 'bg-[#121614]', 'bg-[#1a201c]'][i % 3],
      side: 'left',
    }));
  });
  readonly topLeaders = computed(() => {
    return this.liveAthletes().map((a, i) => ({
      rank: i + 1,
      name: a.athlete_name,
      handle: a.handle,
      sport: a.disciplines?.map(d => this.languageService.translateDiscipline(d)).join(', '),
      shakes: a.total_shakes_this_month,
      totalRaised: a.total_raised_this_month,
      initials: a.athlete_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      avatarUrl: a.avatar_url,
    }));
  });


  

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => this.disciplines.set(items),
    });


    this.exploreService.getMonthlyLeaderboard(3).subscribe({
      next: (athletes) => this.liveAthletes.set(athletes),
    });

    
    if (isPlatformBrowser(this.platformId)) {
      this.intervalId = setInterval(() => {
        this.currentHeroImageIndex.update(i => (i + 1) % this.heroImages.length);
      }, 4500);
    }


  }


  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
      message: this.supportMessage().trim() || (isEn ? 'Best of luck with your training!' : '¡Mucho éxito en tus entrenamientos!'),
      currency: 'USD',
      unitPrice: this.shakePrice,
    });
  }
}

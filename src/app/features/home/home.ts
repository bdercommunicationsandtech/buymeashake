import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  IconDumbbellComponent,
  IconRunningComponent,
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
    IconRunningComponent,
    IconButtonShareComponent,
    IconStarComponent,
    AnimatedShakerComponent,
    AllowedUserTextDirective,
  ],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly checkout = inject(CheckoutService);
  readonly languageService = inject(LanguageService);
  private readonly lookupService = inject(LookupService);
  private readonly exploreService = inject(ExploreService);

  readonly t = this.languageService.t;

  readonly shakePrice = SHAKE_PRICE;
  readonly shakesCount = signal(3);
  readonly supportMessage = signal('');
  readonly disciplines = signal<LookupItemDto[]>([]);
  readonly liveAthletes = signal<AthleteLeaderboardItem[]>([]);

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

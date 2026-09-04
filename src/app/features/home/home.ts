import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import { LanguageService } from '../../core/language.service';
import { SHAKE_PRICE } from '../../core/demo';
import {
  AnimatedKettlebellComponent,
  AnimatedRunnerComponent,
  AnimatedShakerComponent,
  AnimatedDumbbellComponent,
  AnimatedSoccerComponent,
  AnimatedBoxingIconComponent,
  IconButtonShareComponent,
  IconButtonSupportComponent,
  IconDumbbellComponent,
  IconRunningComponent,
  IconShakerComponent,
  IconStarComponent,
} from '../../shared/icons';

export interface FloatingAthlete {
  name: string;
  discipline: string;
  supporters: number;
  initials: string;
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
    IconButtonSupportComponent,
    IconStarComponent,
    AnimatedKettlebellComponent,
    AnimatedShakerComponent,
    AnimatedRunnerComponent,
    AnimatedDumbbellComponent,
    AnimatedSoccerComponent,
    AnimatedBoxingIconComponent,
  ],
  templateUrl: './home.html',
})
export class Home {
  private readonly checkout = inject(CheckoutService);
  private readonly languageService = inject(LanguageService);

  readonly t = this.languageService.t;

  readonly shakePrice = SHAKE_PRICE;
  readonly shakesCount = signal(3);
  readonly supportMessage = signal('');

  readonly leftAthletes = computed<FloatingAthlete[]>(() => {
    const isEn = this.languageService.lang() === 'en';
    return [
      {
        name: 'Sofía Ramírez',
        discipline: 'Powerlifting',
        supporters: 342,
        initials: 'SR',
        bg: 'bg-emerald-500',
        side: 'left',
      },
      {
        name: 'Camila Ortiz',
        discipline: 'CrossFit Games',
        supporters: 215,
        initials: 'CO',
        bg: 'bg-purple-500',
        side: 'left',
      },
      {
        name: 'Lucas Benítez',
        discipline: isEn ? 'Martial Arts / BJJ' : 'Artes Marciales / BJJ',
        supporters: 184,
        initials: 'LB',
        bg: 'bg-red-500',
        side: 'left',
      },
    ];
  });

  readonly topLeaders = [
    { rank: 1, name: 'Sofía Ramírez', handle: 'sofifit', sport: 'Powerlifting', shakes: 342, initials: 'SR' },
    { rank: 2, name: 'Mateo Vargas', handle: 'mateorun', sport: 'Ultra Running', shakes: 289, initials: 'MV' },
    { rank: 3, name: 'Camila Ortiz', handle: 'cami_cross', sport: 'CrossFit', shakes: 215, initials: 'CO' },
  ];

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

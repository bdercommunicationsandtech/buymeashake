import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/checkout.service';
import { SHAKE_PRICE } from '../../core/demo';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  private readonly checkout = inject(CheckoutService);

  readonly shakePrice = SHAKE_PRICE;
  readonly shakesCount = signal(3);
  readonly supportMessage = signal('');

  readonly leftAthletes: FloatingAthlete[] = [
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
      discipline: 'Artes Marciales / BJJ',
      supporters: 184,
      initials: 'LB',
      bg: 'bg-red-500',
      side: 'left',
    },
  ];

  readonly rightAthletes: FloatingAthlete[] = [
    {
      name: 'Mateo Vargas',
      discipline: 'Ultra Trail Running',
      supporters: 289,
      initials: 'MV',
      bg: 'bg-blue-500',
      side: 'right',
    },
    {
      name: 'Diego Morales',
      discipline: 'Calistenia Freestyle',
      supporters: 156,
      initials: 'DM',
      bg: 'bg-amber-500',
      side: 'right',
    },
    {
      name: 'Andrea Navarro',
      discipline: 'Natación & Triatlón',
      supporters: 104,
      initials: 'AN',
      bg: 'bg-cyan-500',
      side: 'right',
    },
  ];

  readonly topLeaders = [
    { rank: 1, name: 'Sofía Ramírez', handle: 'sofifit', sport: 'Powerlifting', shakes: 342, initials: 'SR' },
    { rank: 2, name: 'Mateo Vargas', handle: 'mateorun', sport: 'Ultra Running', shakes: 289, initials: 'MV' },
    { rank: 3, name: 'Camila Ortiz', handle: 'cami_cross', sport: 'CrossFit', shakes: 215, initials: 'CO' },
  ];

  setShakes(n: number): void {
    this.shakesCount.set(n);
  }

  supportDemo(): void {
    this.checkout.start({
      creatorName: 'Sofía Ramírez',
      creatorHandle: 'sofifit',
      shakes: this.shakesCount(),
      message: this.supportMessage().trim() || '¡Mucho éxito en tus entrenamientos!',
      currency: 'USD',
      unitPrice: this.shakePrice,
    });
  }
}

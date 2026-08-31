import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ReferredAthlete {
  name: string;
  handle: string;
  joinedDate: string;
  shakesCount: number;
  earnedAmount: number;
  status: 'Activo' | 'Pendiente';
}

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './referrals.html',
})
export class DashboardReferrals {
  readonly referralLink = signal('https://buymeashake.com/join?ref=sofifit');
  readonly copied = signal(false);

  readonly referredAthletes = signal<ReferredAthlete[]>([
    {
      name: 'Carlos Mendoza',
      handle: 'carlos_lift',
      joinedDate: '12 Ago 2026',
      shakesCount: 42,
      earnedAmount: 18.5,
      status: 'Activo',
    },
    {
      name: 'Laura Gómez',
      handle: 'laurarunner',
      joinedDate: '24 Jul 2026',
      shakesCount: 88,
      earnedAmount: 38.0,
      status: 'Activo',
    },
    {
      name: 'Martín Silva',
      handle: 'martinsilvafit',
      joinedDate: '15 Jul 2026',
      shakesCount: 0,
      earnedAmount: 0.0,
      status: 'Pendiente',
    },
  ]);

  copyLink(): void {
    navigator.clipboard?.writeText(this.referralLink());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}

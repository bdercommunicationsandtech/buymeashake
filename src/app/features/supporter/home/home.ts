import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

interface SupportedAthlete {
  handle: string;
  name: string;
  sport: string;
  shakesSent: number;
  lastSupportDate: string;
  initials: string;
}

@Component({
  selector: 'app-supporter-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
})
export class SupporterHome {
  readonly auth = inject(AuthService);

  readonly supportedAthletes: SupportedAthlete[] = [
    {
      handle: 'sofifit',
      name: 'Sofía Ramírez',
      sport: 'CrossFit',
      shakesSent: 5,
      lastSupportDate: 'Hace 2 días',
      initials: 'SR',
    },
    {
      handle: 'yahirruiz',
      name: 'Yahir Ruiz',
      sport: 'Boxeo',
      shakesSent: 3,
      lastSupportDate: 'Hace 1 semana',
      initials: 'YR',
    },
    {
      handle: 'mariaclimb',
      name: 'María López',
      sport: 'Escalada',
      shakesSent: 2,
      lastSupportDate: 'Hace 2 semanas',
      initials: 'ML',
    },
  ];

  readonly totalShakes = this.supportedAthletes.reduce((sum, a) => sum + a.shakesSent, 0);
}

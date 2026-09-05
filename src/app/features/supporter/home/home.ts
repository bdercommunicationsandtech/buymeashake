import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';

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
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly supportedAthletes = computed<SupportedAthlete[]>(() => {
    const isEn = this.languageService.currentLang() === 'en';
    return [
      {
        handle: 'sofifit',
        name: 'Sofía Ramírez',
        sport: 'CrossFit',
        shakesSent: 5,
        lastSupportDate: isEn ? '2 days ago' : 'Hace 2 días',
        initials: 'SR',
      },
      {
        handle: 'yahirruiz',
        name: 'Yahir Ruiz',
        sport: isEn ? 'Boxing' : 'Boxeo',
        shakesSent: 3,
        lastSupportDate: isEn ? '1 week ago' : 'Hace 1 semana',
        initials: 'YR',
      },
      {
        handle: 'mariaclimb',
        name: 'María López',
        sport: isEn ? 'Climbing' : 'Escalada',
        shakesSent: 2,
        lastSupportDate: isEn ? '2 weeks ago' : 'Hace 2 semanas',
        initials: 'ML',
      },
    ];
  });

  readonly totalShakes = computed(() => this.supportedAthletes().reduce((sum, a) => sum + a.shakesSent, 0));
}

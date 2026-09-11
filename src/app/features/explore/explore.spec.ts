// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { Injector, PLATFORM_ID, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Explore } from './explore';
import { LanguageService } from '../../core/language.service';
import { LookupService } from '../../core/lookup.service';
import { ExploreService } from '../../core/explore.service';
import { AthleteLeaderboardItem } from '../../core/api.models';

describe('Explore Component - Top 10 Redesign & Fixes', () => {
  let component: Explore;
  let mockExploreService: Partial<ExploreService>;

  const mockLeaderboardData: AthleteLeaderboardItem[] = [
    {
      athlete_id: 8,
      handle: 'atleta8',
      athlete_name: 'Atleta Ocho',
      avatar_url: 'https://example.com/8.jpg',
      disciplines: ['Running'],
      total_shakes_this_month: 2,
      total_raised_this_month: 10,
      ranking_position: 8,
    },
    {
      athlete_id: 1,
      handle: 'campeon',
      athlete_name: 'Atleta Uno',
      avatar_url: 'https://example.com/1.jpg',
      disciplines: ['Fuerza'],
      total_shakes_this_month: 25,
      total_raised_this_month: 150,
      ranking_position: 1,
    },
    {
      athlete_id: 4,
      handle: 'cuarto',
      athlete_name: 'Atleta Cuatro',
      avatar_url: 'https://example.com/4.jpg',
      disciplines: ['CrossFit'],
      total_shakes_this_month: 12,
      total_raised_this_month: 60,
      ranking_position: 4,
    },
    {
      athlete_id: 3,
      handle: 'tercero',
      athlete_name: 'Atleta Tres',
      avatar_url: 'https://example.com/3.jpg',
      disciplines: ['Ciclismo'],
      total_shakes_this_month: 15,
      total_raised_this_month: 80,
      ranking_position: 3,
    },
    {
      athlete_id: 2,
      handle: 'segundo',
      athlete_name: 'Atleta Dos',
      avatar_url: 'https://example.com/2.jpg',
      disciplines: ['Natación'],
      total_shakes_this_month: 20,
      total_raised_this_month: 110,
      ranking_position: 2,
    },
    {
      athlete_id: 5,
      handle: 'quinto',
      athlete_name: 'Atleta Cinco',
      avatar_url: 'https://example.com/5.jpg',
      disciplines: ['Boxeo'],
      total_shakes_this_month: 8,
      total_raised_this_month: 40,
      ranking_position: 5,
    },
  ];

  beforeEach(() => {
    mockExploreService = {
      getMonthlyLeaderboard: () => of(mockLeaderboardData),
      getAthletes: () => of([]),
    };

    const injector = Injector.create({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ExploreService, useValue: mockExploreService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: LookupService, useValue: { getSportDisciplines: () => of([]) } },
        LanguageService,
      ],
    });

    injector.runInContext(() => {
      component = new Explore();
    });

    component.ngOnInit();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Bug Fix 1: Orden estricto del Ranking', () => {
    it('debe ordenar ascendentemente por ranking_position incluso si la API responde desordenada', () => {
      const athletes = component.leaderboardAthletes();
      expect(athletes.length).toBe(6);

      const ranks = athletes.map((a) => a.rank);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 8]);
    });

    it('el podio (topPodium) debe contener estrictamente los puestos #1, #2 y #3', () => {
      const podium = component.topPodium();
      expect(podium.length).toBe(3);
      expect(podium[0].rank).toBe(1);
      expect(podium[1].rank).toBe(2);
      expect(podium[2].rank).toBe(3);
    });

    it('el carrusel (topRemaining) debe arrancar estrictamente en el puesto #4', () => {
      const remaining = component.topRemaining();
      expect(remaining.length).toBe(3);
      expect(remaining[0].rank).toBe(4);
      expect(remaining[1].rank).toBe(5);
      expect(remaining[2].rank).toBe(8);
    });
  });

  describe('Bug Fix 2: Fallback reactivo de Avatar (@carrion_blossom)', () => {
    it('debe registrar el id del atleta en avatarErrors al disparar onAvatarError()', () => {
      expect(component.avatarErrors().has('carrion_blossom')).toBe(false);

      component.onAvatarError('carrion_blossom');

      expect(component.avatarErrors().has('carrion_blossom')).toBe(true);
    });
  });

  describe('Controles dinámicos del Carrusel', () => {
    it('scrollCarousel debe calcular dinámicamente el paso y llamar a scrollBy', () => {
      let scrollCalledWith: any = null;
      const fakeTrack = {
        firstElementChild: { offsetWidth: 240 } as any,
        scrollBy: (options: any) => {
          scrollCalledWith = options;
        },
      } as HTMLElement;

      component.carouselTrack = new ElementRef(fakeTrack);

      // Desplazar a la derecha: paso = 240 + 16 = 256
      component.scrollCarousel('right');
      expect(scrollCalledWith).toEqual({ left: 256, behavior: 'smooth' });

      // Desplazar a la izquierda: paso = -256
      component.scrollCarousel('left');
      expect(scrollCalledWith).toEqual({ left: -256, behavior: 'smooth' });
    });
  });

  describe('Tipografía adaptativa para nombres largos', () => {
    it('debe asignar clases de texto compacto a handles de más de 13 caracteres', () => {
      expect(component.getHandleClass('short')).toBe('text-lg sm:text-xl');
      expect(component.getHandleClass('despapaye_ibarra')).toBe('text-base sm:text-lg');
    });
  });
});

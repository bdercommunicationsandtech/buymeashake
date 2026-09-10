import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Home } from './home';
import { TRANSLATIONS } from '../../core/i18n';
import { LanguageService } from '../../core/language.service';
import { LookupService } from '../../core/lookup.service';
import { ExploreService } from '../../core/explore.service';
import { CheckoutService } from '../../core/checkout.service';

describe('Home Component', () => {
  let component: Home;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        LanguageService,
        {
          provide: LookupService,
          useValue: {
            getSportDisciplines: () => of([]),
          },
        },
        {
          provide: ExploreService,
          useValue: {
            getMonthlyLeaderboard: () => of([]),
          },
        },
        {
          provide: CheckoutService,
          useValue: {
            start: () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Carrusel 3D Coverflow de Disciplinas', () => {
    it('debe inicializarse en el índice 3 (Cross Training) por defecto', () => {
      expect(component.activeDisciplineIndex()).toBe(3);
      expect(component.coverflowDisciplines[3].name).toBe('Cross Training');
    });

    it('debe avanzar a la siguiente disciplina de forma cíclica con nextDiscipline()', () => {
      component.nextDiscipline();
      expect(component.activeDisciplineIndex()).toBe(4);
      expect(component.coverflowDisciplines[4].name).toBe('Bienestar');

      // Avanzar hasta el final y dar la vuelta cíclica
      component.selectDiscipline(component.coverflowDisciplines.length - 1);
      component.nextDiscipline();
      expect(component.activeDisciplineIndex()).toBe(0);
    });

    it('debe retroceder a la disciplina previa de forma cíclica con prevDiscipline()', () => {
      component.selectDiscipline(0);
      component.prevDiscipline();
      const lastIndex = component.coverflowDisciplines.length - 1;
      expect(component.activeDisciplineIndex()).toBe(lastIndex);
    });

    it('debe pausar el autoplay al entrar en hover y reanudarlo al salir', () => {
      component.onMouseEnterCarousel();
      expect(component.isAutoPlaying()).toBe(false);

      component.onMouseLeaveCarousel();
      expect(component.isAutoPlaying()).toBe(true);
    });
  });

  describe('Integridad de Internacionalización (i18n)', () => {
    it('debe contener todas las claves críticas de la landing en español', () => {
      const esHome = TRANSLATIONS.es.home;
      expect(esHome.heroTitlePart1).toBeTruthy();
      expect(esHome.heroTitlePart2).toBeTruthy();
      expect(esHome.heroMotto).toBe('DISCIPLINA HOY, RESULTADOS MAÑANA');
      expect(esHome.startFree).toBeTruthy();
      expect(esHome.exploreAthletesTop10).toBeTruthy();
      expect(esHome.step1Title).toBeTruthy();
      expect(esHome.step2Title).toBeTruthy();
      expect(esHome.step3Title).toBeTruthy();
      expect(esHome.card1Title).toBeTruthy();
      expect(esHome.card2Title).toBeTruthy();
      expect(esHome.card3Title).toBeTruthy();
      expect(esHome.ctaTitle).toBeTruthy();
      expect(esHome.progressStartsHere).toBeTruthy();
    });

    it('debe contener todas las claves críticas de la landing en inglés', () => {
      const enHome = TRANSLATIONS.en.home;
      expect(enHome.heroTitlePart1).toBeTruthy();
      expect(enHome.heroTitlePart2).toBeTruthy();
      expect(enHome.heroMotto).toBe('DISCIPLINE TODAY, RESULTS TOMORROW');
      expect(enHome.startFree).toBeTruthy();
      expect(enHome.exploreAthletesTop10).toBeTruthy();
      expect(enHome.step1Title).toBeTruthy();
      expect(enHome.step2Title).toBeTruthy();
      expect(enHome.step3Title).toBeTruthy();
      expect(enHome.card1Title).toBeTruthy();
      expect(enHome.card2Title).toBeTruthy();
      expect(enHome.card3Title).toBeTruthy();
      expect(enHome.ctaTitle).toBeTruthy();
      expect(enHome.progressStartsHere).toBeTruthy();
    });
  });
});

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExploreService } from '../../core/explore.service';
import { IconShakerComponent, IconTrophyComponent } from '../../shared/icons';

export interface AthleteProfile {
  id: string;
  name: string;
  handle: string;
  initials: string;
  sport: string;
  bio: string;
  shakesThisMonth: number;
  totalRaised: number;
  rank?: number;
  avatarBg?: string;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, IconTrophyComponent, IconShakerComponent],
  templateUrl: './explore.html',
})
export class Explore implements OnInit {
  private readonly exploreService = inject(ExploreService);

  readonly selectedCategory = signal<string>('Todos');
  readonly searchQuery = signal<string>('');
  readonly loading = signal(false);

  readonly categories = [
    'Todos',
    'Fuerza & Levantamiento',
    'CrossFit',
    'Running & Atletismo',
    'Ciclismo & Ruta',
    'Artes Marciales & Boxeo',
    'Deportes Acuáticos',
    'Fútbol & Colectivos',
    'Movilidad & Yoga',
    'Calistenia',
  ];

  readonly athletes = signal<AthleteProfile[]>([
    {
      id: '1',
      name: 'Sofía Ramírez',
      handle: 'sofifit',
      initials: 'SR',
      sport: 'Fuerza & Levantamiento',
      bio: 'Entrenadora y competidora de Powerlifting. Rumbo al campeonato Panamericano 2026.',
      shakesThisMonth: 342,
      totalRaised: 1890,
      rank: 1,
      avatarBg: 'bg-emerald-500',
    },
    {
      id: '2',
      name: 'Mateo Vargas',
      handle: 'mateorun',
      initials: 'MV',
      sport: 'Running & Atletismo',
      bio: 'Maratonista elite (2:18 PR). Entrenando para el Maratón de Valencia.',
      shakesThisMonth: 280,
      totalRaised: 1400,
      rank: 2,
      avatarBg: 'bg-blue-500',
    },
    {
      id: '3',
      name: 'Camila Torres',
      handle: 'camifit',
      initials: 'CT',
      sport: 'CrossFit',
      bio: 'Atleta Semifinalista CrossFit Games & Coach de halterofilia.',
      shakesThisMonth: 215,
      totalRaised: 1075,
      rank: 3,
      avatarBg: 'bg-indigo-500',
    },
    {
      id: '4',
      name: 'Lucas Benítez',
      handle: 'lucasbjj',
      initials: 'LB',
      sport: 'Artes Marciales & Boxeo',
      bio: 'Cinturón negro de Brazilian Jiu-Jitsu. Preparación para el Mundial IBJJF.',
      shakesThisMonth: 160,
      totalRaised: 800,
      rank: 4,
      avatarBg: 'bg-purple-500',
    },
  ]);

  ngOnInit(): void {
    this.fetchLeaderboard();
  }

  fetchLeaderboard(): void {
    this.exploreService.getMonthlyLeaderboard(10).subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          const mapped: AthleteProfile[] = items.map((it) => ({
            id: String(it.athlete_id),
            name: it.athlete_name,
            handle: it.handle,
            initials: it.athlete_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
            sport: it.primary_sport,
            bio: 'Atleta oficial en buymeashake.fit',
            shakesThisMonth: it.total_shakes_this_month,
            totalRaised: Number(it.total_raised_this_month),
            rank: it.ranking_position,
            avatarBg: it.ranking_position === 1 ? 'bg-amber-500' : it.ranking_position === 2 ? 'bg-slate-400' : 'bg-amber-700',
          }));
          this.athletes.set(mapped);
        }
      },
      error: () => {
        // En caso de que el backend no tenga atletas aún, conserva los datos demo
      },
    });
  }

  readonly topAthletes = computed(() => {
    return [...this.athletes()]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .slice(0, 10);
  });

  readonly topPodium = computed(() => {
    return this.athletes().slice(0, 3);
  });

  readonly topRemaining = computed(() => {
    return this.athletes().slice(3, 10);
  });

  readonly filteredAthletes = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.athletes().filter((athlete) => {
      const matchesCategory =
        category === 'Todos' || athlete.sport === category;
      const matchesQuery =
        !query ||
        athlete.name.toLowerCase().includes(query) ||
        athlete.handle.toLowerCase().includes(query) ||
        athlete.sport.toLowerCase().includes(query) ||
        athlete.bio.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  });

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }
}

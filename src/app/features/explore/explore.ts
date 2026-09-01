import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExploreService } from '../../core/explore.service';
import { LookupService } from '../../core/lookup.service';
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
  private readonly lookupService = inject(LookupService);

  readonly selectedCategory = signal<string>('Todos');
  readonly searchQuery = signal<string>('');
  readonly loading = signal(false);

  readonly categories = signal<string[]>(['Todos']);

  readonly athletes = signal<AthleteProfile[]>([]);

  ngOnInit(): void {
    this.loadDisciplines();
    this.fetchLeaderboard();
  }

  loadDisciplines(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        const labels = items.map((i) => i.label);
        this.categories.set(['Todos', ...labels]);
      },
      error: () => {},
    });
  }

  fetchLeaderboard(): void {
    this.loading.set(true);
    this.exploreService.getMonthlyLeaderboard(10).subscribe({
      next: (items) => {
        this.loading.set(false);
        if (!items?.length) return;

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
          avatarBg:
            it.ranking_position === 1
              ? 'bg-amber-500'
              : it.ranking_position === 2
                ? 'bg-slate-400'
                : 'bg-amber-700',
        }));
        this.athletes.set(mapped);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  readonly topAthletes = computed(() => {
    return [...this.athletes()]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .slice(0, 10);
  });

  readonly topPodium = computed(() => this.athletes().slice(0, 3));

  readonly topRemaining = computed(() => this.athletes().slice(3, 10));

  readonly filteredAthletes = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.athletes().filter((athlete) => {
      const matchesCategory =
        category === 'Todos' || athlete.sport.includes(category) || category.includes(athlete.sport);
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

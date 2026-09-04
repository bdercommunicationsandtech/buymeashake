import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExploreService } from '../../core/explore.service';
import { LookupService } from '../../core/lookup.service';
import { LanguageService } from '../../core/language.service';
import { IconShakerComponent, IconTrophyComponent } from '../../shared/icons';
import { AthleteLeaderboardItem } from '../../core/api.models';

export interface AthleteProfile {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarUrl: string | null;
  sport: string;
  bio: string;
  shakesThisMonth: number;
  totalRaised: number;
  rank?: number;
  avatarBg?: string;
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'y')
    .trim();
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
  readonly languageService = inject(LanguageService);

  readonly t = this.languageService.t;

  readonly selectedCategory = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly leaderboardLoading = signal(false);
  readonly athletesLoading = signal(false);

  readonly categories = signal<string[]>(['ALL']);

  readonly leaderboardAthletes = signal<AthleteProfile[]>([]);
  readonly exploreAthletes = signal<AthleteProfile[]>([]);

  ngOnInit(): void {
    this.loadDisciplines();
    this.fetchLeaderboard();
    this.fetchAthletes();
  }

  loadDisciplines(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        const labels = items.map((i) => i.label);
        this.categories.set(['ALL', ...labels]);
      },
      error: () => {},
    });
  }

  fetchLeaderboard(): void {
    this.leaderboardLoading.set(true);
    this.exploreService.getMonthlyLeaderboard(10).subscribe({
      next: (items) => {
        this.leaderboardLoading.set(false);
        if (!items?.length) return;

        const mapped: AthleteProfile[] = items.map((it) => this.mapToProfile(it));
        this.leaderboardAthletes.set(mapped);
      },
      error: () => {
        this.leaderboardLoading.set(false);
      },
    });
  }

  fetchAthletes(): void {
    this.athletesLoading.set(true);
    this.exploreService.getAthletes({ limit: 100 }).subscribe({
      next: (items) => {
        this.athletesLoading.set(false);
        if (!items?.length) return;

        const mapped: AthleteProfile[] = items.map((it) => this.mapToProfile(it));
        this.exploreAthletes.set(mapped);
      },
      error: () => {
        this.athletesLoading.set(false);
      },
    });
  }

  private mapToProfile(it: AthleteLeaderboardItem): AthleteProfile {
    const names = it.athlete_name.trim().split(/\s+/);
    const initials = names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : it.athlete_name.slice(0, 2).toUpperCase();

    return {
      id: String(it.athlete_id),
      name: it.athlete_name,
      handle: it.handle,
      initials,
      avatarUrl: it.avatar_url,
      sport: it.primary_sport || 'Deporte General',
      bio: it.bio || 'Atleta oficial en buymeashake.fit',
      shakesThisMonth: it.total_shakes_this_month,
      totalRaised: Number(it.total_raised_this_month),
      rank: it.ranking_position,
      avatarBg:
        it.ranking_position === 1
          ? 'bg-amber-500'
          : it.ranking_position === 2
            ? 'bg-slate-400'
            : 'bg-amber-700',
    };
  }

  readonly topPodium = computed(() => this.leaderboardAthletes().slice(0, 3));

  readonly topRemaining = computed(() => this.leaderboardAthletes().slice(3, 10));

  readonly filteredAthletes = computed(() => {
    const category = this.selectedCategory();
    const query = normalizeText(this.searchQuery());

    const sourceAthletes = this.exploreAthletes().length > 0
      ? this.exploreAthletes()
      : this.leaderboardAthletes();

    return sourceAthletes.filter((athlete) => {
      const athleteSportNorm = normalizeText(athlete.sport);
      const catNorm = normalizeText(category);
      const translatedCatNorm = normalizeText(this.languageService.translateDiscipline(category));

      const matchesCategory =
        category === 'ALL' ||
        category === 'Todos' ||
        category === 'All' ||
        athleteSportNorm.includes(catNorm) ||
        catNorm.includes(athleteSportNorm) ||
        athleteSportNorm.includes(translatedCatNorm) ||
        translatedCatNorm.includes(athleteSportNorm);

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const athleteNameNorm = normalizeText(athlete.name);
      const athleteHandleNorm = normalizeText(athlete.handle);
      const athleteBioNorm = normalizeText(athlete.bio);

      return (
        athleteNameNorm.includes(query) ||
        athleteHandleNorm.includes(query) ||
        athleteSportNorm.includes(query) ||
        athleteBioNorm.includes(query)
      );
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

import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './explore.html',
})
export class Explore {
  readonly selectedCategory = signal<string>('Todos');
  readonly searchQuery = signal<string>('');

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
      bio: 'Maratonista y ultra trail runner. Financiando boleto y preparación para UTMB Mont-Blanc.',
      shakesThisMonth: 289,
      totalRaised: 1420,
      rank: 2,
      avatarBg: 'bg-blue-500',
    },
    {
      id: '3',
      name: 'Camila Ortiz',
      handle: 'cami_cross',
      initials: 'CO',
      sport: 'CrossFit',
      bio: 'Semifinalista CrossFit Games. Recaudando para viaje y hospedaje en Torneo Internacional.',
      shakesThisMonth: 215,
      totalRaised: 1150,
      rank: 3,
      avatarBg: 'bg-purple-500',
    },
    {
      id: '4',
      name: 'Lucas Benítez',
      handle: 'lucas_bjj',
      initials: 'LB',
      sport: 'Artes Marciales & Boxeo',
      bio: 'Cinturón marrón BJJ y competidor IBJJF. Preparación y campamento para el Mundial Master.',
      shakesThisMonth: 184,
      totalRaised: 980,
      rank: 4,
      avatarBg: 'bg-red-500',
    },
    {
      id: '5',
      name: 'Diego Morales',
      handle: 'diegocali',
      initials: 'DM',
      sport: 'Calistenia',
      bio: 'Atleta de Street Workout & Calistenia freestyle. Competencias nacionales y talleres.',
      shakesThisMonth: 156,
      totalRaised: 790,
      rank: 5,
      avatarBg: 'bg-amber-500',
    },
    {
      id: '6',
      name: 'Valeria Serna',
      handle: 'valenutri',
      initials: 'VS',
      sport: 'Movilidad & Yoga',
      bio: 'Especialista en movilidad articular, recuperación deportiva y prevención de lesiones.',
      shakesThisMonth: 132,
      totalRaised: 680,
      rank: 6,
      avatarBg: 'bg-rose-500',
    },
    {
      id: '7',
      name: 'Javier Restrepo',
      handle: 'javi_pedal',
      initials: 'JR',
      sport: 'Ciclismo & Ruta',
      bio: 'Ciclista de ruta élite. Equipamiento y mantenimiento de bicicleta para Vuelta Nacional.',
      shakesThisMonth: 118,
      totalRaised: 590,
      rank: 7,
      avatarBg: 'bg-teal-500',
    },
    {
      id: '8',
      name: 'Andrea Navarro',
      handle: 'andrea_swim',
      initials: 'AN',
      sport: 'Deportes Acuáticos',
      bio: 'Nadadora de aguas abiertas y triatleta. Entrenando para el cruce de Cozumel 10K.',
      shakesThisMonth: 104,
      totalRaised: 520,
      rank: 8,
      avatarBg: 'bg-cyan-500',
    },
    {
      id: '9',
      name: 'Carlos Rivas',
      handle: 'carlos_box',
      initials: 'CR',
      sport: 'Artes Marciales & Boxeo',
      bio: 'Boxeador amateur en busca del debut profesional. Guantes, vendajes y sparrings.',
      shakesThisMonth: 95,
      totalRaised: 470,
      rank: 9,
      avatarBg: 'bg-orange-500',
    },
    {
      id: '10',
      name: 'Elena Fuentes',
      handle: 'elena_tri',
      initials: 'EF',
      sport: 'Fútbol & Colectivos',
      bio: 'Jugadora de fútbol semiprofesional y preparadora física juvenil.',
      shakesThisMonth: 82,
      totalRaised: 410,
      rank: 10,
      avatarBg: 'bg-lime-600',
    },
  ]);

  readonly topPodium = computed(() => {
    return this.athletes().slice(0, 3);
  });

  readonly topRemaining = computed(() => {
    return this.athletes().slice(3, 10);
  });

  readonly filteredAthletes = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.athletes().filter((athlete) => {
      const matchesCat = cat === 'Todos' || athlete.sport.toLowerCase().includes(cat.toLowerCase());
      const matchesQuery =
        !query ||
        athlete.name.toLowerCase().includes(query) ||
        athlete.handle.toLowerCase().includes(query) ||
        athlete.sport.toLowerCase().includes(query) ||
        athlete.bio.toLowerCase().includes(query);

      return matchesCat && matchesQuery;
    });
  });

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }
}

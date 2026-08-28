/**
 * Datos estáticos del prototipo. No hay backend: todo lo que se muestra en
 * pantalla proviene de este archivo para que el demo sea autocontenido.
 */

export type ActivityId = 'shaker' | 'squat' | 'run' | 'jump' | 'cycling' | 'weights' | 'cross';

export interface Activity {
  readonly id: ActivityId;
  readonly name: string;
  readonly short: string;
  readonly tagline: string;
  /** Kilocalorías estimadas para 10 minutos de actividad. */
  readonly kcal: number;
  readonly hint: string;
}

export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'shaker',
    name: 'Shaker clásico',
    short: 'Shaker',
    tagline: 'Batido de proteína recién agitado',
    kcal: 24,
    hint: 'La moneda oficial de buymeashake: 30 g de proteína bien mezclada.',
  },
  {
    id: 'squat',
    name: 'Sentadilla',
    short: 'Sentadilla',
    tagline: 'Cadera abajo, pecho arriba',
    kcal: 95,
    hint: 'Rango completo, rodillas estables y core activo en cada repetición.',
  },
  {
    id: 'run',
    name: 'Correr',
    short: 'Correr',
    tagline: 'Zancada larga y cadencia alta',
    kcal: 130,
    hint: 'Ritmo cómodo de 5:30 min/km para construir base aeróbica.',
  },
  {
    id: 'jump',
    name: 'Salto de cuerda',
    short: 'Saltar',
    tagline: 'Doble unders y muñecas suaves',
    kcal: 145,
    hint: 'El calentamiento favorito de los coaches: coordinación y pulso arriba.',
  },
  {
    id: 'cycling',
    name: 'Ciclismo',
    short: 'Ciclismo',
    tagline: 'Cadencia constante sobre el pedal',
    kcal: 110,
    hint: 'Bajo impacto, ideal para volumen sin castigar rodillas.',
  },
  {
    id: 'weights',
    name: 'Pesas',
    short: 'Pesas',
    tagline: 'Press militar por encima de la cabeza',
    kcal: 70,
    hint: 'Fuerza pura: barra bloqueada arriba y glúteos apretados.',
  },
  {
    id: 'cross',
    name: 'Cross training',
    short: 'Cross',
    tagline: 'Star jumps sin bajar el ritmo',
    kcal: 160,
    hint: 'Intervalos metabólicos: 40 segundos on, 20 off, sin negociar.',
  },
] as const;

export const SHAKE_PRICE = 3;

export const QUICK_SHAKES: readonly number[] = [1, 3, 5];

export interface Creator {
  readonly handle: string;
  readonly name: string;
  readonly role: string;
  readonly city: string;
  readonly bio: string;
  readonly initials: string;
  readonly goalTitle: string;
  readonly goalTarget: number;
  readonly goalRaised: number;
  readonly supporters: number;
  readonly streakDays: number;
  readonly disciplines: readonly string[];
}

export const DEMO_CREATOR: Creator = {
  handle: 'sofifit',
  name: 'Sofía Ramírez',
  role: 'Coach de fuerza y acondicionamiento',
  city: 'Guadalajara, MX',
  bio: 'Entreno a 40 personas a la semana y publico rutinas gratis para quien quiera empezar sin gimnasio. Cada shake que me invitas se convierte en equipo nuevo para el box y en más contenido abierto para la comunidad.',
  initials: 'SR',
  goalTitle: 'Rack de sentadillas y juego de discos para el box',
  goalTarget: 1200,
  goalRaised: 786,
  supporters: 214,
  streakDays: 96,
  disciplines: ['Fuerza', 'Cross training', 'Movilidad', 'Running'],
};

export interface Supporter {
  readonly name: string;
  readonly initials: string;
  readonly shakes: number;
  readonly message: string;
  readonly when: string;
  readonly activity: ActivityId;
}

export const RECENT_SUPPORTERS: readonly Supporter[] = [
  {
    name: 'Andrés Villalobos',
    initials: 'AV',
    shakes: 5,
    message: 'Bajé 8 kg siguiendo tus bloques de fuerza. Va un shake doble por el rack nuevo.',
    when: 'hace 12 minutos',
    activity: 'weights',
  },
  {
    name: 'Mariana Cruz',
    initials: 'MC',
    shakes: 3,
    message: 'Tu rutina de movilidad me salvó las rodillas antes del medio maratón.',
    when: 'hace 2 horas',
    activity: 'run',
  },
  {
    name: 'Anónimo',
    initials: '??',
    shakes: 1,
    message: 'Primer día en el gym gracias a ti. Hoy hice mis primeras 10 sentadillas limpias.',
    when: 'hace 5 horas',
    activity: 'squat',
  },
  {
    name: 'Diego Fuentes',
    initials: 'DF',
    shakes: 10,
    message: 'Coach, los doble unders ya salen. Aquí va la ronda para el equipo completo.',
    when: 'ayer',
    activity: 'jump',
  },
  {
    name: 'Paula Ibarra',
    initials: 'PI',
    shakes: 2,
    message: 'Me encanta que todo el contenido siga siendo gratis. Sigue así.',
    when: 'hace 2 días',
    activity: 'cycling',
  },
];

export interface Step {
  readonly index: string;
  readonly title: string;
  readonly detail: string;
}

export const HOW_IT_WORKS: readonly Step[] = [
  {
    index: '01',
    title: 'Arma tu perfil de atleta',
    detail:
      'Elige tu handle, cuenta qué entrenas y define una meta concreta: equipo, viaje a competencia o contenido abierto.',
  },
  {
    index: '02',
    title: 'Comparte tu widget',
    detail:
      'Pega el widget animado en tu web, bio o descripción de video. Tu comunidad elige cuántos shakes te invita.',
  },
  {
    index: '03',
    title: 'Recibe y sigue entrenando',
    detail:
      'Los pagos llegan por Stripe y tú te concentras en entrenar. Sin mensualidad, sin contratos raros.',
  },
];

export const TICKER_ITEMS: readonly string[] = [
  'Sin mensualidad',
  'Shaker interactivo',
  'Pagos con Stripe',
  'Widget incrustable',
  'Metas de recaudación',
  'Mensajes de la comunidad',
  'Hecho para atletas',
];

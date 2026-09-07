import { Component, computed, effect, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeoCity, GeoCountry, GeoService, GeoState } from '../../core/geo.service';

/**
 * Selectores en cascada País → Estado → Ciudad.
 * País usa banderas por imagen (Windows no renderiza flag emoji en <select>).
 */
@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="relative" data-country-picker>
        <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">País</label>
        <button
          type="button"
          class="w-full flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none text-left"
          (click)="countryMenuOpen.set(!countryMenuOpen())"
        >
          @if (selectedCountry(); as c) {
            <img
              [src]="flagUrl(c.iso2)"
              [alt]="c.iso2 || ''"
              width="20"
              height="15"
              class="shrink-0 rounded-sm object-cover"
              loading="lazy"
            />
            <span class="truncate flex-1">{{ c.name }}</span>
          } @else {
            <span class="text-gray-400 dark:text-gray-500">Selecciona país</span>
          }
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        @if (countryMenuOpen()) {
          <div
            class="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] shadow-xl"
            role="listbox"
          >
            @for (c of countries(); track c.id) {
              <button
                type="button"
                role="option"
                class="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                [class.bg-[#c9ff3d]/10]="countryId() === c.id"
                (click)="onCountryChange(c.id)"
              >
                <img
                  [src]="flagUrl(c.iso2)"
                  [alt]="c.iso2 || ''"
                  width="20"
                  height="15"
                  class="shrink-0 rounded-sm object-cover"
                  loading="lazy"
                />
                <span class="truncate">{{ c.name }}</span>
              </button>
            }
          </div>
        }
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Estado</label>
        <select
          class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none disabled:opacity-50"
          [value]="stateId() ?? ''"
          [disabled]="!countryId()"
          (change)="onStateChange(+$any($event.target).value)"
        >
          <option value="">Selecciona estado</option>
          @for (s of states(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
        <select
          class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none disabled:opacity-50"
          [value]="cityId() ?? ''"
          [disabled]="!stateId()"
          (change)="onCityChange(+$any($event.target).value)"
        >
          <option value="">Selecciona ciudad</option>
          @for (city of cities(); track city.id) {
            <option [value]="city.id">{{ city.name }}</option>
          }
        </select>
      </div>
    </div>
  `,
})
export class LocationPickerComponent {
  private readonly geo = inject(GeoService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** city_id inicial desde el perfil (opcional) */
  readonly initialCityId = input<number | null>(null);
  /** ISO2 preferido al abrir sin city (default MX) */
  readonly defaultCountryCode = input('MX');

  readonly cityIdChange = output<number | null>();
  readonly labelChange = output<string | null>();

  readonly countries = signal<GeoCountry[]>([]);
  readonly states = signal<GeoState[]>([]);
  readonly cities = signal<GeoCity[]>([]);
  readonly countryId = signal<number | null>(null);
  readonly stateId = signal<number | null>(null);
  readonly cityId = signal<number | null>(null);
  readonly countryMenuOpen = signal(false);

  readonly selectedCountry = computed(() => {
    const id = this.countryId();
    if (id == null) return null;
    return this.countries().find((c) => c.id === id) ?? null;
  });

  private hydrated = false;
  private lastHydratedId: number | null = null;

  constructor() {
    this.geo.listCountries().subscribe({
      next: (list) => {
        this.countries.set(list);
        if (!this.initialCityId()) {
          this.selectDefaultCountry(list);
        }
      },
    });

    effect(() => {
      const id = this.initialCityId();
      if (id == null) {
        if (this.hydrated && this.lastHydratedId != null) {
          this.hydrated = false;
          this.lastHydratedId = null;
          this.cityId.set(null);
          this.stateId.set(null);
          this.selectDefaultCountry(this.countries());
        }
        return;
      }
      if (this.hydrated && this.lastHydratedId === id) return;
      this.hydrateFromCityId(id);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.countryMenuOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.countryMenuOpen.set(false);
    }
  }

  flagUrl(iso2: string | null | undefined): string {
    const code = (iso2 || '').toLowerCase();
    if (!code || code.length !== 2) {
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    }
    return `https://flagcdn.com/w40/${code}.png`;
  }

  private selectDefaultCountry(list: GeoCountry[]): void {
    const code = this.defaultCountryCode().toUpperCase();
    const match = list.find((c) => (c.iso2 || '').toUpperCase() === code);
    if (match) {
      this.countryId.set(match.id);
      this.loadStates(match.id);
    }
  }

  private hydrateFromCityId(cityId: number): void {
    this.geo.getCity(cityId).subscribe({
      next: (detail) => {
        this.hydrated = true;
        this.lastHydratedId = cityId;
        this.countryId.set(detail.country_id);
        this.stateId.set(detail.state_id);
        this.cityId.set(detail.id);
        this.loadStates(detail.country_id, detail.state_id);
        this.loadCities(detail.state_id);
        this.labelChange.emit(detail.label);
      },
      error: () => {
        this.hydrated = true;
        this.lastHydratedId = cityId;
        this.selectDefaultCountry(this.countries());
      },
    });
  }

  private loadStates(countryId: number, keepStateId?: number): void {
    this.geo.listStates({ countryId }).subscribe({
      next: (list) => {
        this.states.set(list);
        if (keepStateId != null) this.stateId.set(keepStateId);
      },
    });
  }

  private loadCities(stateId: number): void {
    this.geo.listCities({ stateId, limit: 500 }).subscribe({
      next: (list) => this.cities.set(list),
    });
  }

  onCountryChange(id: number): void {
    this.countryMenuOpen.set(false);
    this.countryId.set(id || null);
    this.stateId.set(null);
    this.cityId.set(null);
    this.states.set([]);
    this.cities.set([]);
    this.cityIdChange.emit(null);
    this.labelChange.emit(null);
    if (id) this.loadStates(id);
  }

  onStateChange(id: number): void {
    this.stateId.set(id || null);
    this.cityId.set(null);
    this.cities.set([]);
    this.cityIdChange.emit(null);
    this.labelChange.emit(null);
    if (id) this.loadCities(id);
  }

  onCityChange(id: number): void {
    this.cityId.set(id || null);
    this.cityIdChange.emit(id || null);
    if (!id) {
      this.labelChange.emit(null);
      return;
    }
    const city = this.cities().find((c) => c.id === id);
    const state = this.states().find((s) => s.id === this.stateId());
    const country = this.countries().find((c) => c.id === this.countryId());
    const label = [city?.name, state?.name, country?.iso2].filter(Boolean).join(', ');
    this.labelChange.emit(label || null);
  }
}

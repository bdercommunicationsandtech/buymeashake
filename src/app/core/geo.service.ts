import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeoCountry {
  id: number;
  name: string;
  iso2: string | null;
  emoji: string | null;
}

export interface GeoState {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  iso2: string | null;
}

export interface GeoCity {
  id: number;
  name: string;
  state_id: number;
  country_id: number;
  country_code: string;
  state_code?: string | null;
}

export interface GeoCityDetail {
  id: number;
  name: string;
  state_id: number;
  state_name: string | null;
  country_id: number;
  country_code: string;
  country_name: string | null;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/geo`;

  listCountries(): Observable<GeoCountry[]> {
    return this.http.get<GeoCountry[]>(`${this.apiUrl}/countries`);
  }

  listStates(opts: { countryId?: number; countryCode?: string }): Observable<GeoState[]> {
    let params = new HttpParams();
    if (opts.countryId != null) params = params.set('country_id', opts.countryId);
    if (opts.countryCode) params = params.set('country_code', opts.countryCode);
    return this.http.get<GeoState[]>(`${this.apiUrl}/states`, { params });
  }

  listCities(opts: {
    stateId?: number;
    countryCode?: string;
    q?: string;
    limit?: number;
  }): Observable<GeoCity[]> {
    let params = new HttpParams();
    if (opts.stateId != null) params = params.set('state_id', opts.stateId);
    if (opts.countryCode) params = params.set('country_code', opts.countryCode);
    if (opts.q) params = params.set('q', opts.q);
    if (opts.limit != null) params = params.set('limit', opts.limit);
    return this.http.get<GeoCity[]>(`${this.apiUrl}/cities`, { params });
  }

  getCity(cityId: number): Observable<GeoCityDetail> {
    return this.http.get<GeoCityDetail>(`${this.apiUrl}/cities/${cityId}`);
  }
}

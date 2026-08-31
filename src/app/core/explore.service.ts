import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AthleteLeaderboardItem,
  CreatorProfile,
  LookupGroupDto,
} from './api.models';

@Injectable({
  providedIn: 'root',
})
export class ExploreService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMonthlyLeaderboard(limit = 10): Observable<AthleteLeaderboardItem[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<AthleteLeaderboardItem[]>(`${this.apiUrl}/explore/leaderboard`, { params });
  }

  getCreatorProfile(handle: string): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(`${this.apiUrl}/creators/${handle}`);
  }

  getSystemLookups(): Observable<LookupGroupDto[]> {
    return this.http.get<LookupGroupDto[]>(`${this.apiUrl}/system/lookups`);
  }
}

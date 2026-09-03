import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AthleteLeaderboardItem,
  CreatorProfile,
  LookupGroupDto,
  PostItemDto,
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

  getAthletes(params?: { q?: string; category?: string; limit?: number }): Observable<AthleteLeaderboardItem[]> {
    let httpParams = new HttpParams();
    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.category && params.category !== 'Todos') {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit);
    }
    return this.http.get<AthleteLeaderboardItem[]>(`${this.apiUrl}/explore/athletes`, { params: httpParams });
  }

  getCreatorProfile(handle: string): Observable<CreatorProfile> {
    const cleanHandle = handle.replace(/^@+/, '');
    return this.http.get<CreatorProfile>(`${this.apiUrl}/creators/${encodeURIComponent(cleanHandle)}`);
  }

  getCreatorPosts(handle: string): Observable<PostItemDto[]> {
    return this.http.get<PostItemDto[]>(`${this.apiUrl}/creators/${handle}/posts`);
  }

  getCreatorPost(handle: string, postId: number | string): Observable<PostItemDto> {
    return this.http.get<PostItemDto>(`${this.apiUrl}/creators/${handle}/posts/${postId}`);
  }

  getSystemLookups(): Observable<LookupGroupDto[]> {
    return this.http.get<LookupGroupDto[]>(`${this.apiUrl}/system/lookups`);
  }
}

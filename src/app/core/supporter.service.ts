import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FollowedAthlete, PaginatedResponse, PostResponse } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class SupporterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/fan`;

  getFeed(page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<PostResponse>> {
    return this.http.get<PaginatedResponse<PostResponse>>(`${this.apiUrl}/feed`, {
      params: { page, page_size: pageSize },
    });
  }

  getFollowing(): Observable<FollowedAthlete[]> {
    return this.http.get<FollowedAthlete[]>(`${this.apiUrl}/following`);
  }

  checkFollowStatus(handle: string): Observable<{ following: boolean }> {
    return this.http.get<{ following: boolean }>(`${this.apiUrl}/follow/${handle}/status`);
  }

  followAthlete(handle: string): Observable<{ message: string; following: boolean }> {
    return this.http.post<{ message: string; following: boolean }>(`${this.apiUrl}/follow/${handle}`, {});
  }

  unfollowAthlete(handle: string): Observable<{ message: string; following: boolean }> {
    return this.http.delete<{ message: string; following: boolean }>(`${this.apiUrl}/follow/${handle}`);
  }
}

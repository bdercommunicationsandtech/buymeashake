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

  getFeed(
    page: number = 1,
    pageSize: number = 10,
    accessType?: 'public' | 'shake_supporters' | 'members_only' | null,
  ): Observable<PaginatedResponse<PostResponse>> {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (accessType) {
      params['access_type'] = accessType;
    }
    return this.http.get<PaginatedResponse<PostResponse>>(`${this.apiUrl}/feed`, { params });
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

  likePost(postId: number): Observable<{ success: boolean; likes_count: number; liked: boolean }> {
    return this.http.post<{ success: boolean; likes_count: number; liked: boolean }>(
      `${this.apiUrl}/posts/${postId}/like`,
      {},
    );
  }

  commentOnPost(postId: number, content: string): Observable<{
    id: number;
    post_id: number;
    user_id: number;
    user_name: string;
    user_avatar: string | null;
    content: string;
    likes_count: number;
    created_at: string;
  }> {
    return this.http.post<{
      id: number;
      post_id: number;
      user_id: number;
      user_name: string;
      user_avatar: string | null;
      content: string;
      likes_count: number;
      created_at: string;
    }>(`${this.apiUrl}/posts/${postId}/comments`, { content });
  }

  deleteComment(postId: number, commentId: number): Observable<{ success: boolean; deleted: boolean }> {
    return this.http.delete<{ success: boolean; deleted: boolean }>(
      `${this.apiUrl}/posts/${postId}/comments/${commentId}`,
    );
  }
}

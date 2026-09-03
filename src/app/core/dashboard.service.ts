import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AthleteProfileFull,
  AthleteProfileUpdatePayload,
  BookingAppointmentItem,
  CreatorBookingService,
  DashboardMetrics,
  DigitalProductItem,
  GoalCreatePayload,
  GoalItem,
  MembershipTierItem,
  PostCreatePayload,
  PostItemDto,
  ReferralDashboardData,
  SupportersDashboardDto,
  UploadFileResult,
} from './api.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/metrics`);
  }

  getMembershipTiers(): Observable<MembershipTierItem[]> {
    return this.http.get<MembershipTierItem[]>(`${this.apiUrl}/memberships/tiers`);
  }

  createMembershipTier(payload: { name: string; description?: string; monthly_price: number; currency?: string; benefits: string[] }): Observable<MembershipTierItem> {
    return this.http.post<MembershipTierItem>(`${this.apiUrl}/memberships/tiers`, payload);
  }

  getProducts(): Observable<DigitalProductItem[]> {
    return this.http.get<DigitalProductItem[]>(`${this.apiUrl}/shop/products`);
  }

  createProduct(payload: { title: string; description?: string; price: number; currency?: string; file_type: string; file_url: string }): Observable<DigitalProductItem> {
    return this.http.post<DigitalProductItem>(`${this.apiUrl}/shop/products`, payload);
  }

  getBookingServices(): Observable<CreatorBookingService[]> {
    return this.http.get<CreatorBookingService[]>(`${this.apiUrl}/bookings/services`);
  }

  getAppointments(): Observable<BookingAppointmentItem[]> {
    return this.http.get<BookingAppointmentItem[]>(`${this.apiUrl}/bookings/appointments`);
  }

  getReferrals(): Observable<ReferralDashboardData> {
    return this.http.get<ReferralDashboardData>(`${this.apiUrl}/referrals`);
  }

  getProfile(): Observable<AthleteProfileFull> {
    return this.http.get<AthleteProfileFull>(`${this.apiUrl}/profile`);
  }

  updateProfile(payload: AthleteProfileUpdatePayload): Observable<AthleteProfileFull> {
    return this.http.put<AthleteProfileFull>(`${this.apiUrl}/profile`, payload);
  }

  getGoals(): Observable<GoalItem[]> {
    return this.http.get<GoalItem[]>(`${this.apiUrl}/goals`);
  }

  createGoal(payload: GoalCreatePayload): Observable<GoalItem> {
    return this.http.post<GoalItem>(`${this.apiUrl}/goals`, payload);
  }

  updateGoal(goalId: number, payload: { title?: string; target_amount?: number; is_active?: boolean }): Observable<GoalItem> {
    return this.http.put<GoalItem>(`${this.apiUrl}/goals/${goalId}`, payload);
  }

  uploadImage(file: File): Observable<UploadFileResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadFileResult>(`${environment.apiUrl}/uploads/image`, formData);
  }

  uploadProductFile(file: File): Observable<UploadFileResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadFileResult>(`${environment.apiUrl}/uploads/product`, formData);
  }

  getPosts(): Observable<PostItemDto[]> {
    return this.http.get<PostItemDto[]>(`${this.apiUrl}/posts`);
  }

  createPost(payload: PostCreatePayload): Observable<PostItemDto> {
    return this.http.post<PostItemDto>(`${this.apiUrl}/posts`, payload);
  }

  getSupporters(): Observable<SupportersDashboardDto> {
    return this.http.get<SupportersDashboardDto>(`${this.apiUrl}/supporters`);
  }

  getNotifications(): Observable<{ id: number; title: string; message: string; type_code: number; action_url: string | null; is_read: boolean; created_at: string }[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications`);
  }

  markNotificationRead(notificationId: number): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  replyToSupporter(transactionId: number, replyText: string): Observable<{ success: boolean; message: string; reply: string }> {
    return this.http.post<{ success: boolean; message: string; reply: string }>(
      `${this.apiUrl}/supporters/${transactionId}/reply`,
      { reply_text: replyText }
    );
  }

  toggleLikeSupporter(transactionId: number): Observable<{ success: boolean; is_liked: boolean }> {
    return this.http.post<{ success: boolean; is_liked: boolean }>(
      `${this.apiUrl}/supporters/${transactionId}/like`,
      {}
    );
  }
}

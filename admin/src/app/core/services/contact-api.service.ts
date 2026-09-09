import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  ContactTicketListParams,
  ContactTicketListResponse,
  ContactTicketReplyPayload,
  ContactTicketStatusPayload,
} from '../models/contact-ticket.model';

@Injectable({
  providedIn: 'root',
})
export class ContactApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.contact}`;

  getList(params: ContactTicketListParams = {}): Observable<ContactTicketListResponse> {
    let httpParams = new HttpParams().set('limit', String(params.limit ?? 50));
    if (params.last_id != null && params.last_id > 0) {
      httpParams = httpParams.set('last_id', String(params.last_id));
    }
    if (params.read_filter) {
      httpParams = httpParams.set('read_filter', params.read_filter);
    }
    if (params.status_filter) {
      httpParams = httpParams.set('status_filter', params.status_filter);
    }
    if (params.role_filter) {
      httpParams = httpParams.set('role_filter', params.role_filter);
    }
    if (params.category_filter) {
      httpParams = httpParams.set('category_filter', params.category_filter);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    return this.http.get<ContactTicketListResponse>(this.base, { params: httpParams });
  }

  getById(id: number): Observable<ContactTicketListResponse> {
    return this.http.get<ContactTicketListResponse>(`${this.base}/${id}`);
  }

  reply(id: number, payload: ContactTicketReplyPayload): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/reply`, payload);
  }

  updateStatus(id: number, payload: ContactTicketStatusPayload): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/status`, payload);
  }

  toggleRead(id: number, isRead: boolean): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/read`, { is_read: isRead });
  }
}

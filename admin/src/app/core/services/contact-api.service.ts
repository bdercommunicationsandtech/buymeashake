import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  ContactTicketListParams,
  ContactTicketListResponse,
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
    return this.http.get<ContactTicketListResponse>(this.base, { params: httpParams });
  }

  getById(id: number): Observable<ContactTicketListResponse> {
    return this.http.get<ContactTicketListResponse>(`${this.base}/${id}`);
  }
}

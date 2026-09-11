import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  DisciplineAdminItem,
  DisciplineCreatePayload,
  DisciplineUpdatePayload,
} from '../models/discipline.model';

@Injectable({ providedIn: 'root' })
export class DisciplinesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.disciplines}`;

  list(): Observable<DisciplineAdminItem[]> {
    return this.http.get<DisciplineAdminItem[]>(`${this.base}/`);
  }

  create(payload: DisciplineCreatePayload): Observable<DisciplineAdminItem> {
    return this.http.post<DisciplineAdminItem>(`${this.base}/`, payload);
  }

  update(id: number, payload: DisciplineUpdatePayload): Observable<DisciplineAdminItem> {
    return this.http.put<DisciplineAdminItem>(`${this.base}/${id}`, payload);
  }

  deactivate(id: number): Observable<DisciplineAdminItem> {
    return this.http.delete<DisciplineAdminItem>(`${this.base}/${id}`);
  }

  uploadImage(file: File): Observable<{ url: string; filename: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; filename: string }>(
      `${API_CONFIG.baseUrl}/uploads/image`,
      form,
    );
  }

  uploadIcon(file: File): Observable<{ url: string; filename: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; filename: string }>(
      `${API_CONFIG.baseUrl}/uploads/discipline-icon`,
      form,
    );
  }
}

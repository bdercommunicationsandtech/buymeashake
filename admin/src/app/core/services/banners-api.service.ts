import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  BannerAdminItem,
  BannerCreatePayload,
  BannerUpdatePayload,
  BannerActionCatalogueItem,
  BannerActionCatalogueListResponse,
  BannerActionCataloguePayload,
} from '../models/banner.model';

@Injectable({
  providedIn: 'root',
})
export class BannersApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.banners}`;

  getList(): Observable<BannerAdminItem[]> {
    return this.http.get<BannerAdminItem[]>(`${this.base}/`);
  }

  create(payload: BannerCreatePayload): Observable<BannerAdminItem> {
    return this.http.post<BannerAdminItem>(`${this.base}/`, payload);
  }

  update(id: number, payload: BannerUpdatePayload): Observable<BannerAdminItem> {
    return this.http.put<BannerAdminItem>(`${this.base}/${id}`, payload);
  }

  /** Soft-delete / deactivate (status_id = 0). */
  deactivate(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.base}/${id}`);
  }

  getActionsCatalogue(): Observable<BannerActionCatalogueListResponse> {
    return this.http.get<BannerActionCatalogueListResponse>(`${this.base}/actions-catalogue`);
  }

  createActionCatalogue(payload: BannerActionCataloguePayload): Observable<BannerActionCatalogueItem> {
    return this.http.post<BannerActionCatalogueItem>(`${this.base}/actions-catalogue`, payload);
  }

  updateActionCatalogue(
    id: number,
    payload: BannerActionCataloguePayload,
  ): Observable<BannerActionCatalogueItem> {
    return this.http.put<BannerActionCatalogueItem>(`${this.base}/actions-catalogue/${id}`, payload);
  }

  deleteActionCatalogue(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.base}/actions-catalogue/${id}`);
  }
}

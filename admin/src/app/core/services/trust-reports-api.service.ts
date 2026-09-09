import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  AdminReportVerdictPayload,
  AdminReportVerdictResponse,
  TrustReport,
  TrustReportListParams,
  TrustReportListResponse,
  TrustReportStatusUpdatePayload,
} from '../models/trust-report.model';

@Injectable({
  providedIn: 'root',
})
export class TrustReportsApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.trustReports}`;

  getList(params: TrustReportListParams = {}): Observable<TrustReportListResponse> {
    let httpParams = new HttpParams()
      .set('limit', String(params.limit ?? 50))
      .set('offset', String(params.offset ?? 0));

    if (params.status_filter && params.status_filter !== 'all') {
      httpParams = httpParams.set('status_filter', params.status_filter);
    }
    if (params.priority_filter && params.priority_filter !== 'all') {
      httpParams = httpParams.set('priority_filter', params.priority_filter);
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<TrustReportListResponse>(this.base, { params: httpParams });
  }

  getById(idOrFolio: string | number): Observable<TrustReport> {
    return this.http.get<TrustReport>(`${this.base}/${idOrFolio}`);
  }

  updateStatus(
    idOrFolio: string | number,
    payload: TrustReportStatusUpdatePayload,
  ): Observable<TrustReport> {
    return this.http.patch<TrustReport>(`${this.base}/${idOrFolio}/status`, payload);
  }

  submitVerdict(
    idOrFolio: string | number,
    payload: AdminReportVerdictPayload,
  ): Observable<AdminReportVerdictResponse> {
    return this.http.post<AdminReportVerdictResponse>(`${this.base}/${idOrFolio}/verdict`, payload);
  }
}

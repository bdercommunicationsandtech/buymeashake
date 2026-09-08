import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  TrustReportListParams,
  TrustReportListResponse,
  TrustReportMutationResponse,
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

    if (params.status_filter) {
      httpParams = httpParams.set('status_filter', params.status_filter);
    }
    if (params.priority_filter) {
      httpParams = httpParams.set('priority_filter', params.priority_filter);
    }
    if (params.assigned_moderator_id != null) {
      httpParams = httpParams.set('assigned_moderator_id', String(params.assigned_moderator_id));
    }

    return this.http.get<TrustReportListResponse>(this.base, { params: httpParams });
  }

  updateStatus(
    id: number,
    payload: TrustReportStatusUpdatePayload,
  ): Observable<TrustReportMutationResponse> {
    return this.http.patch<TrustReportMutationResponse>(`${this.base}/${id}/status`, payload);
  }
}

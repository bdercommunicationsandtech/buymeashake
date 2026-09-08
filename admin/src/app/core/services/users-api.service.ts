import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  AdminRoleCatalogueResponse,
  AdminUser,
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserMutationResponse,
  AdminUserRolesResponse,
  AdminUserStatusPayload,
  AdminUserUpdatePayload,
  EmailBlacklistCreatePayload,
  EmailBlacklistListParams,
  EmailBlacklistListResponse,
  EmailBlacklistMutationResponse,
  EmailBlacklistUpdatePayload,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.users}`;

  getList(params: AdminUserListParams = {}): Observable<AdminUserListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    const role = params.role?.trim().toLowerCase();
    if (role && role !== 'all') {
      httpParams = httpParams.set('role', role);
    } else if (params.role_id === 1 || params.role_id === 2) {
      httpParams = httpParams.set('role_id', String(params.role_id));
    }
    if (params.include_deleted) {
      httpParams = httpParams.set('include_deleted', 'true');
    }

    return this.http.get<AdminUserListResponse>(this.base, { params: httpParams });
  }

  getById(id: number): Observable<{ code: number; result: AdminUser }> {
    return this.http.get<{ code: number; result: AdminUser }>(`${this.base}/${id}`);
  }

  getRolesCatalogue(): Observable<AdminRoleCatalogueResponse> {
    return this.http.get<AdminRoleCatalogueResponse>(`${this.base}/roles`);
  }

  assignRole(userId: number, roleName: string): Observable<AdminUserRolesResponse> {
    return this.http.post<AdminUserRolesResponse>(`${this.base}/${userId}/roles`, {
      role_name: roleName,
    });
  }

  removeRole(userId: number, roleName: string): Observable<AdminUserRolesResponse> {
    return this.http.delete<AdminUserRolesResponse>(
      `${this.base}/${userId}/roles/${encodeURIComponent(roleName)}`,
    );
  }

  update(id: number, payload: AdminUserUpdatePayload): Observable<AdminUserMutationResponse> {
    return this.http.put<AdminUserMutationResponse>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: number, payload: AdminUserStatusPayload): Observable<AdminUserMutationResponse> {
    return this.http.patch<AdminUserMutationResponse>(`${this.base}/${id}/status`, payload);
  }

  delete(id: number): Observable<AdminUserMutationResponse> {
    return this.http.delete<AdminUserMutationResponse>(`${this.base}/${id}`);
  }

  updateLegalHold(id: number, legal_hold: boolean): Observable<AdminUserMutationResponse> {
    return this.http.patch<AdminUserMutationResponse>(`${this.base}/${id}/legal-hold`, { legal_hold });
  }

  getBlacklist(params: EmailBlacklistListParams = {}): Observable<EmailBlacklistListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    return this.http.get<EmailBlacklistListResponse>(`${this.base}/blacklist`, {
      params: httpParams,
    });
  }

  addBlacklist(payload: EmailBlacklistCreatePayload): Observable<EmailBlacklistMutationResponse> {
    return this.http.post<EmailBlacklistMutationResponse>(`${this.base}/blacklist`, payload);
  }

  updateBlacklist(
    id: number,
    payload: EmailBlacklistUpdatePayload,
  ): Observable<EmailBlacklistMutationResponse> {
    return this.http.put<EmailBlacklistMutationResponse>(`${this.base}/blacklist/${id}`, payload);
  }

  deleteBlacklist(id: number): Observable<EmailBlacklistMutationResponse> {
    return this.http.delete<EmailBlacklistMutationResponse>(`${this.base}/blacklist/${id}`);
  }
}

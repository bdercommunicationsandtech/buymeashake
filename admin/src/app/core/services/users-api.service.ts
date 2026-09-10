import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  ActiveSuspensionsResponse,
  AdminRoleCatalogueResponse,
  AdminUser,
  AdminUserCatalogParams,
  AdminUserCatalogResponse,
  AdminUserDetailResponse,
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserMutationResponse,
  AdminUserRolesResponse,
  AdminUserStatusPayload,
  AdminUserUpdatePayload,
  AppealBanPayload,
  AppealStrikePayload,
  BanUserPayload,
  DisciplinarySanctionItem,
  EmailBlacklistCreatePayload,
  EmailBlacklistListParams,
  EmailBlacklistListResponse,
  EmailBlacklistMutationResponse,
  EmailBlacklistUpdatePayload,
  GlobalSanctionsResponse,
  IssueStrikePayload,
  IssueWarningPayload,
  SuspendUserPayload,
  UserSanctionsSummary,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.users}`;
  private sanctionsBase = `${API_CONFIG.baseUrl}/admin/sanctions`;


  /** Catálogo de usuarios BMS con filtros por nombre y rol, metas activas y recaudación */
  getCatalog(params: AdminUserCatalogParams = {}): Observable<AdminUserCatalogResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    const role = params.role?.trim().toLowerCase();
    if (role && role !== 'all') {
      httpParams = httpParams.set('role', role);
    }
    const status = params.status?.trim().toLowerCase();
    if (status && status !== 'all') {
      httpParams = httpParams.set('status', status);
    }
    const goals = params.goals_filter?.trim().toLowerCase();
    if (goals && goals !== 'all') {
      httpParams = httpParams.set('goals_filter', goals);
    }
    const rev = params.revenue_filter?.trim().toLowerCase();
    if (rev && rev !== 'all') {
      httpParams = httpParams.set('revenue_filter', rev);
    }
    if (params.sort_by) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }
    if (params.sort_order) {
      httpParams = httpParams.set('sort_order', params.sort_order);
    }

    return this.http.get<AdminUserCatalogResponse>(this.base, { params: httpParams });
  }

  /** Detalle completo de un usuario */
  getDetail(userId: number): Observable<AdminUserDetailResponse> {
    return this.http.get<AdminUserDetailResponse>(`${this.base}/${userId}`);
  }

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

  appealBlacklist(itemId: number, payload: AppealBanPayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/blacklist/${itemId}/appeal`, payload);
  }

  issueStrike(userId: number, payload: IssueStrikePayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/strike`, payload);
  }

  appealStrike(sanctionId: number, payload: AppealStrikePayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.sanctionsBase}/strikes/${sanctionId}/appeal`, payload);
  }

  appealUserStrike(userId: number, sanctionId: number, payload: AppealStrikePayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/strikes/${sanctionId}/appeal`, payload);
  }

  getSanctions(userId: number): Observable<{ code: number; message: string; result: { summary: UserSanctionsSummary; sanctions: DisciplinarySanctionItem[] } }> {
    return this.http.get<{ code: number; message: string; result: { summary: UserSanctionsSummary; sanctions: DisciplinarySanctionItem[] } }>(`${this.base}/${userId}/sanctions`);
  }

  banUser(userId: number, payload: BanUserPayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/ban`, payload);
  }

  appealBanUser(userId: number, payload: AppealBanPayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/appeal`, payload);
  }

  suspendUser(userId: number, payload: SuspendUserPayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/suspend`, payload);
  }

  unsuspendUser(userId: number): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/unsuspend`, {});
  }

  issueWarning(userId: number, payload: IssueWarningPayload): Observable<{ code: number; message: string; result: any }> {
    return this.http.post<{ code: number; message: string; result: any }>(`${this.base}/${userId}/warning`, payload);
  }

  getActiveSuspensions(params: { search?: string; page?: number; limit?: number } = {}): Observable<ActiveSuspensionsResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    return this.http.get<ActiveSuspensionsResponse>(`${this.sanctionsBase}/suspensions`, { params: httpParams });
  }

  getGlobalSanctions(params: {
    action_type?: string;
    category?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<GlobalSanctionsResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));
    if (params.action_type && params.action_type !== 'all') {
      httpParams = httpParams.set('action_type', params.action_type);
    }
    if (params.category && params.category !== 'all') {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', String(params.is_active));
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    return this.http.get<GlobalSanctionsResponse>(`${this.sanctionsBase}`, { params: httpParams });
  }
}


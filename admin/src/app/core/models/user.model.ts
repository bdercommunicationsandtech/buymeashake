export type AccountEnforcementStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'RESTRICTED';

export interface AdminUserEnforcement {
  status: AccountEnforcementStatus | string;
  suspended_until?: string | null;
  ban_reason?: string | null;
  active_strikes_count?: number;
  total_strikes_points?: number;
  last_sanction_at?: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  alternate_email: string;
  registration_date?: string | null;
  role_id: number;
  role_name: string;
  /** Roles activos (multi-rol). */
  roles?: string[];
  deleted?: boolean;
  legal_hold?: boolean;
  enforcement?: AdminUserEnforcement;
}

export interface AdminRoleItem {
  id: number;
  name: string;
  description?: string | null;
}

export interface AdminRoleCatalogueResponse {
  code: number;
  message?: string;
  result: AdminRoleItem[];
}

export interface AdminUserRolesResponse {
  code: number;
  message?: string;
  result: string[];
  user?: AdminUser | null;
}

export interface AdminUserUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  gender?: string;
  phone_number?: string;
  alternate_email?: string;
  role_id?: number;
  password?: string;
}

export interface AdminUserStatusPayload {
  status: AccountEnforcementStatus;
  reason?: string;
  duration_days?: number | null;
}

export interface AdminUserListParams {
  search?: string;
  /** Filtrar por rol activo: admin | user | marketing */
  role?: string | null;
  role_id?: number | null;
  page?: number;
  limit?: number;
  include_deleted?: boolean;
}

export interface AdminUserListResponse {
  code: number;
  message?: string;
  result: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserMutationResponse {
  code: number;
  message?: string;
  result?: AdminUser | null;
}

export interface EmailBlacklistItem {
  id: number;
  email: string;
  reason?: string | null;
  user_id?: number | null;
  created_by?: number | null;
  created_at?: string | null;
}

export interface EmailBlacklistListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmailBlacklistListResponse {
  code: number;
  message?: string;
  result: EmailBlacklistItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EmailBlacklistCreatePayload {
  email: string;
  reason?: string;
}

export interface EmailBlacklistUpdatePayload {
  reason?: string | null;
}

export interface EmailBlacklistMutationResponse {
  code: number;
  message?: string;
  result?: EmailBlacklistItem | null;
}

export const ROLE_OPTIONS = [
  { id: 1, label: 'Admin' },
  { id: 2, label: 'Usuario normal' },
] as const;

/** Etiquetas de UI para nombres de rol del API. */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  user: 'Usuario normal',
  marketing: 'Marketing',
};

export function roleLabel(name: string): string {
  const key = String(name || '').trim().toLowerCase();
  return ROLE_LABELS[key] || key;
}

/** Rol base: siempre asignado y no removible. */
export const DEFAULT_ROLE_NAME = 'user';

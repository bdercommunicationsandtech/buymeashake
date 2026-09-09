export type AccountEnforcementStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'RESTRICTED';

export interface AdminGoalSummary {
  id: number;
  title: string;
  cover_image_url?: string | null;
  target_amount: number;
  raised_amount: number;
  currency: string;
  is_active: boolean;
  progress_pct: number;
  achieved_at?: string | null;
  created_at?: string | null;
}

export interface AdminUserFinancialSummary {
  total_raised: number;
  currency: string;
  successful_tx_count: number;
  total_shakes_count: number;
  total_contributed: number;
}

export interface AdminUserCatalogItem {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at?: string | null;
  roles: string[];
  athlete_id?: number | null;
  athlete_handle?: string | null;
  is_verified_athlete: boolean;
  active_goals: AdminGoalSummary[];
  active_goals_count: number;
  total_goals_count: number;
  financials: AdminUserFinancialSummary;
}

export interface AdminUserCatalogResponse {
  items: AdminUserCatalogItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminUserDetailResponse {
  user: AdminUserCatalogItem;
  all_goals: AdminGoalSummary[];
  bio?: string | null;
  city?: string | null;
}

export interface AdminUserCatalogParams {
  search?: string;
  role?: string;
  status?: string;
  goals_filter?: string;
  revenue_filter?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

export const BMS_ROLES = [
  { key: 'all', label: 'Todos' },
  { key: 'athlete', label: 'Atletas' },
  { key: 'supporter', label: 'Supporters' },
  { key: 'admin', label: 'Admins' },
] as const;

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

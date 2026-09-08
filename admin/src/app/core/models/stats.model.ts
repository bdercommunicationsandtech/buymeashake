export interface AdminUserCounts {
  supporters: number;
  athletes: number;
  total: number;
}

export interface AdminGmvStats {
  total: number | string;
  currency: string;
  shakes: number | string;
  memberships: number | string;
  shop: number | string;
  bookings: number | string;
  successful_count: number;
}

export interface AdminRecentUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string | null;
  athlete_handle: string | null;
}

export interface PlatformStats {
  users: AdminUserCounts;
  gmv: AdminGmvStats;
  recent_supporters: AdminRecentUser[];
  recent_athletes: AdminRecentUser[];
}

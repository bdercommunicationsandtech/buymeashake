// app/core/models/stats.model.ts

export interface UserRoleCount {
  admins: number;
  users: number;
  total: number;
}

export interface RecentUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  registration_date: string | null;
  role_id: number;
  role_name: string;
}

export interface RecentListing {
  id: number;
  name: string;
  brand: string;
  model: string;
  status: string;
  published_at: string | null;
  user_id: number;
  image_url: string | null;
}

export interface EngagementBySource {
  chats_total: number;
  messages_last_30d: number;
}

export type ChatEngagementLeader = 'buy_now' | 'inverse' | 'tie';

export interface ChatEngagementStats {
  sales: EngagementBySource;
  offers: EngagementBySource;
  unlinked_chats: number;
  leader: ChatEngagementLeader | string;
}

export interface PlatformStats {
  users: UserRoleCount;
  seller_listings_total: number;
  buyer_listings_total: number;
  recent_users: RecentUser[];
  recent_seller_listings: RecentListing[];
  recent_buyer_listings: RecentListing[];
  chat_engagement: ChatEngagementStats;
}

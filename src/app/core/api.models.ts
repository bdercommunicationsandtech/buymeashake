export interface RequestOtpPayload {
  email: string;
  name?: string;
  athlete_handle?: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface RequestOtpResponse {
  message: string;
  expires_in_seconds: number;
  demo_code?: string;
}

export interface FollowedAthlete {
  id: number;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  primary_sport: string | null;
}

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'supporter' | 'athlete';
  handle?: string;
  primary_sport_code?: number;
  referral_code?: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserMe {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_email_verified: boolean;
  athlete_handle: string | null;
  referral_code: string | null;
}

export interface AthleteLeaderboardItem {
  athlete_id: number;
  handle: string;
  athlete_name: string;
  avatar_url: string | null;
  primary_sport: string;
  bio?: string | null;
  total_shakes_this_month: number;
  total_raised_this_month: number;
  ranking_position: number;
}

export interface CreatorBookingService {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  platform: string;
}

export interface CreatorProfile {
  id: number;
  handle: string;
  name: string;
  bio: string | null;
  page_title: string | null;
  page_description: string | null;
  agenda_title: string | null;
  agenda_description: string | null;
  agenda_image_url?: string | null;
  primary_sport: string;
  city: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  shake_price: number;
  currency: string;
  is_verified: boolean;
  active_goal_title: string | null;
  active_goal_target: number | null;
  active_goal_raised: number | null;
  active_goal_cover_image_url?: string | null;
  booking_services: CreatorBookingService[];
  tiers?: MembershipTierItem[];
  products?: DigitalProductItem[];
  recent_supporters?: SupporterItemDto[];
  total_shakes_received?: number;
  followers_count?: number;
  members_count?: number;
}

export interface DashboardMetrics {
  total_earnings_30d: number;
  total_shakes_30d: number;
  active_members_count: number;
  monthly_recurring_revenue: number;
  earnings_by_type: { [key: string]: number };
  currency: string;
}

export interface MembershipTierItem {
  id: number;
  name: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  is_active: boolean;
  benefits: string[];
  members_count: number;
}

export interface DigitalProductItem {
  id: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  file_type: string;
  file_url: string;
  is_active: boolean;
}

export interface BookingAppointmentItem {
  id: number;
  supporter_name: string;
  service_title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  status_code: number;
}

export interface ReferralDashboardData {
  referral_link: string;
  invited_athletes_count: number;
  active_athletes_count: number;
  total_shakes_generated: number;
  total_earned_commission: number;
  referred_athletes: {
    name: string;
    handle: string;
    joined_date: string;
    shakes_count: number;
    earned_commission: number;
    status: string;
  }[];
}

export interface LookupItemDto {
  code: number;
  label: string;
  icon: string | null;
  sort_order: number;
}

export interface LookupGroupDto {
  code: number;
  name: string;
  description: string | null;
  items: LookupItemDto[];
}

export interface AthleteProfileFull {
  id: number;
  handle: string;
  full_name: string;
  email: string;
  bio: string | null;
  page_title?: string | null;
  page_description?: string | null;
  agenda_title?: string | null;
  agenda_description?: string | null;
  agenda_image_url?: string | null;
  city: string | null;
  primary_sport_code: number | null;
  shake_price: number;
  currency: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  is_verified: boolean;
  referral_code: string;
  thank_you_message?: string | null;
}

export interface AthleteProfileUpdatePayload {
  full_name?: string;
  bio?: string;
  page_title?: string | null;
  page_description?: string | null;
  agenda_title?: string | null;
  agenda_description?: string | null;
  agenda_image_url?: string | null;
  city?: string;
  primary_sport_code?: number;
  shake_price?: number;
  currency?: string;
  avatar_url?: string;
  cover_image_url?: string;
  google_analytics_id?: string;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  thank_you_message?: string;
}

export interface GoalItem {
  id: number;
  title: string;
  target_amount: number;
  raised_amount: number;
  currency: string;
  is_active: boolean;
  cover_image_url?: string | null;
  achieved_at: string | null;
  created_at: string;
}

export interface GoalCreatePayload {
  title: string;
  target_amount: number;
  currency?: string;
  cover_image_url?: string | null;
}

export interface UploadFileResult {
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface ShakeDetailsPayload {
  shakes_count: number;
  supporter_message?: string;
  is_anonymous?: boolean;
}

export interface ShakeCheckoutPayload {
  athlete_handle: string;
  currency?: string;
  supporter_name?: string;
  supporter_email?: string;
  shake_details: ShakeDetailsPayload;
  recurring?: boolean;
}

export interface PaymentIntentResult {
  client_secret: string;
  transaction_uuid: string;
  gross_amount: number;
  currency: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PostCommentDto {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  content: string;
  likes_count: number;
  created_at: string;
}

export interface PostResponse {
  id: number;
  title: string;
  content_html: string;
  access_type: string;
  likes_count: number;
  published_at: string;
  is_members_only: boolean;
  author_name?: string | null;
  author_handle?: string | null;
  comments?: PostCommentDto[];
}

export interface PostItemDto {
  id: number;
  title: string;
  content_html: string;
  access_type: string;
  likes_count: number;
  published_at: string;
  is_members_only: boolean;
  author_name?: string | null;
  author_handle?: string | null;
  comments?: PostCommentDto[];
}

export interface PostCreatePayload {
  title: string;
  content_html: string;
  access_type?: 'public' | 'followers_only' | 'members_only';
}

export interface ShakeDetailsDto {
  shakes_count: number;
  supporter_message: string | null;
  is_anonymous: boolean;
  creator_reply?: string | null;
  creator_reply_at?: string | null;
  is_liked_by_creator?: boolean;
}

export interface SupporterItemDto {
  id: number;
  supporter_name: string;
  gross_amount: number;
  currency: string;
  created_at: string;
  shake_details: ShakeDetailsDto;
}

export interface SupportersDashboardDto {
  supporter_count: number;
  last_30_days_total: number;
  all_time_total: number;
  currency: string;
  items: SupporterItemDto[];
}


export interface LoginRequest {
  email: string;
  password: string;
  cf_turnstile_token?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_admin?: boolean;
  avatar_url?: string | null;
  photo?: string | null;
  photo_url?: string | null;
}

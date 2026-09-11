export const BANNER_STATUS_ACTIVE = 1;
export const BANNER_STATUS_INACTIVE = 0;

export interface BannerAdminItem {
  id: number;
  title?: string | null;
  description?: string | null;
  title_en?: string | null;
  description_en?: string | null;
  image_url: string;
  show_action: boolean;
  action_text?: string | null;
  action_text_en?: string | null;
  action_url?: string | null;
  action_url_mobile?: string | null;
  display_order: number;
  status_id: number;
  for_user?: string | null;
  platform: string;
  created_date: string;
  updated_date: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface BannerCreatePayload {
  title?: string | null;
  description?: string | null;
  title_en?: string | null;
  description_en?: string | null;
  image_url: string;
  show_action: boolean;
  action_text?: string | null;
  action_text_en?: string | null;
  action_url?: string | null;
  action_url_mobile?: string | null;
  display_order: number;
  status_id: number;
  for_user?: string | null;
  platform: string;
}

export interface BannerUpdatePayload {
  title?: string | null;
  description?: string | null;
  title_en?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  show_action?: boolean;
  action_text?: string | null;
  action_text_en?: string | null;
  action_url?: string | null;
  action_url_mobile?: string | null;
  display_order?: number;
  status_id?: number;
  for_user?: string | null;
  platform?: string;
}

export interface BannerFormState {
  title: string;
  description: string;
  title_en: string;
  description_en: string;
  image_url: string;
  show_action: boolean;
  action_text: string;
  action_text_en: string;
  action_url: string;
  action_url_mobile: string;
  display_order: number;
  status_id: number;
  for_user: string;
  platform: string;
}

export interface BannerActionCatalogueItem {
  id: number;
  name: string;
  description?: string | null;
  action_url?: string | null;
  action_url_mobile?: string | null;
}

export interface BannerActionCatalogueListResponse {
  items: BannerActionCatalogueItem[];
}

export interface BannerActionCataloguePayload {
  name: string;
  description?: string | null;
  action_url?: string | null;
  action_url_mobile?: string | null;
}

export interface BannerActionCatalogueFormState {
  name: string;
  description: string;
  action_url: string;
  action_url_mobile: string;
}

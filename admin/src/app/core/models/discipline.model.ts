export interface DisciplineAdminItem {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  icon_url: string | null;
  sort_order: number;
  show_in_home: boolean;
  is_active: boolean;
}

export interface DisciplineCreatePayload {
  name: string;
  description?: string | null;
  image_url?: string | null;
  icon_url?: string | null;
  sort_order?: number;
  show_in_home?: boolean;
  is_active?: boolean;
}

export interface DisciplineUpdatePayload {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  icon_url?: string | null;
  sort_order?: number;
  show_in_home?: boolean;
  is_active?: boolean;
}

export interface DisciplineFormState {
  name: string;
  description: string;
  image_url: string;
  icon_url: string;
  sort_order: number;
  show_in_home: boolean;
  is_active: boolean;
}

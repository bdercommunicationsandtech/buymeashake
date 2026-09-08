/**
 * Status general of a listing/product
 */
export type ProductStatusType = 'active' | 'inactive' | 'moderated' | 'deleted' | 'completed' | 'reserved';

/**
 * Image of a product
 */
export interface ProductImageItem {
  id?: number;
  file_name: string;
  url: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * User/owner of the listing
 */
export interface ListingOwnerUser {
  user_id: number;
  name: string;
  last_name: string;
  username: string;
  email: string;
  profile_photo?: string | null;
}

/**
 * Seller Product listing (publicación de venta)
 */
export interface SellerProductListing {
  id: number;
  user_id: number;
  name: string;
  price: number;
  original_price?: number | null;
  code?: string;
  sku?: string;
  condition: string; // 'nuevo' | 'usado'
  brand?: string;
  model?: string;
  description: string;
  availability: number;
  published_at?: string;
  category_id: number;
  subcategory_id?: number | null;
  category?: string;
  category_esp?: string;
  category_es?: string;
  subcategory?: string;
  subcategory_esp?: string;
  subcategory_es?: string;
  status: ProductStatusType;
  currency: string;
  location?: string | null;
  city_id?: number | null;
  images: string;
  images_list: ProductImageItem[];
  user?: ListingOwnerUser;
  email?: string;
  offers_count?: number;
}

/**
 * Buyer Product listing (solicitud de compra)
 */
export interface BuyerProductListing {
  id: number;
  user_id: number;
  name: string;
  min_price: number;
  max_price: number;
  code?: string;
  condition: string; // 'nuevo' | 'usado'
  brand?: string;
  model?: string;
  description: string;
  quantity: number;
  published_at?: string;
  category_id: number;
  subcategory_id?: number | null;
  category?: string;
  category_esp?: string;
  category_es?: string;
  subcategory?: string;
  subcategory_esp?: string;
  subcategory_es?: string;
  status: ProductStatusType;
  currency: string;
  location?: string | null;
  city_id?: number | null;
  delivery_midpoint: boolean;
  delivery_home: boolean;
  delivery_pickup: boolean;
  limit_max_price: boolean;
  images: string;
  images_list: ProductImageItem[];
  user?: ListingOwnerUser;
  email?: string;
  offers_count?: number;
}

/**
 * Admin search parameters for listings
 */
export interface ListingAdminFilterParams {
  search?: string;
  status?: string; // 'all' | 'active' | 'inactive' | 'moderated' | 'deleted' | 'completed' | 'reserved'
  category_id?: number;
  user_id?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard API Response wrapper
 */
export interface APIResponse<T> {
  code?: number;
  message: string;
  result: T;
  total?: number;
}

/**
 * Product Moderation Log entry
 */
export interface ProductModerationLogItem {
  id: number;
  product_type: 'SELLER' | 'BUYER';
  product_id: number;
  admin_id: number;
  admin_name?: string;
  action: string;
  previous_status: string;
  new_status: string;
  reason?: string;
  notes?: string;
  created_at: string;
}


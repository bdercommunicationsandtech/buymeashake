import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  SellerProductListing,
  BuyerProductListing,
  ListingAdminFilterParams,
  APIResponse,
  ProductStatusType,
  ProductModerationLogItem,
} from '../models/listings.model';

@Injectable({
  providedIn: 'root',
})
export class ListingsService {
  private http = inject(HttpClient);

  // High-quality mock database in memory for local testing/demo
  private mockSellers: SellerProductListing[] = [
    {
      id: 101,
      user_id: 12,
      name: 'iPhone 14 Pro Max 256GB - Excelente Estado',
      price: 18500.0,
      original_price: 22000.0,
      code: 'IPHONE14PM',
      condition: 'usado',
      brand: 'Apple',
      model: '14 Pro Max',
      description: 'Pantalla intacta, batería al 92%. Incluye cargador original y funda de regalo. Estética de 9.5/10.',
      availability: 1,
      published_at: '2026-08-01',
      category_id: 1,
      category: 'Smartphones',
      category_es: 'Celulares',
      subcategory: 'iOS',
      subcategory_es: 'iOS',
      status: 'active',
      currency: 'MXN',
      location: 'Ciudad de México',
      images: 'https://images.unsplash.com/photo-1678652197286-f12c3edab127?w=500&auto=format&fit=crop&q=60',
      images_list: [
        { file_name: 'iphone_1.webp', url: 'https://images.unsplash.com/photo-1678652197286-f12c3edab127?w=500&auto=format&fit=crop&q=60', is_primary: true, display_order: 0 },
      ],
      user: {
        user_id: 12,
        name: 'Roberto',
        last_name: 'Gómez',
        username: 'roberto_g',
        email: 'roberto.gomez@mail.com',
      },
      email: 'roberto.gomez@mail.com',
      offers_count: 3,
    },
    {
      id: 102,
      user_id: 15,
      name: 'Laptop Gamer ASUS ROG Zephyrus G14',
      price: 24999.00,
      original_price: 29999.00,
      code: 'ASUSG14',
      condition: 'usado',
      brand: 'ASUS',
      model: 'Zephyrus G14',
      description: 'Ryzen 9, RTX 3060, 16GB RAM, 1TB SSD. Menos de un año de uso moderado. Excelente rendimiento.',
      availability: 1,
      published_at: '2026-07-28',
      category_id: 2,
      category: 'Computers',
      category_es: 'Computadoras',
      subcategory: 'Laptops',
      subcategory_es: 'Laptops',
      status: 'active',
      currency: 'MXN',
      location: 'Monterrey, NL',
      images: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60',
      images_list: [
        { file_name: 'laptop_1.webp', url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60', is_primary: true, display_order: 0 },
      ],
      user: {
        user_id: 15,
        name: 'Fernanda',
        last_name: 'López',
        username: 'fer_lopez',
        email: 'fer.lopez@mail.com',
      },
      email: 'fer.lopez@mail.com',
      offers_count: 0,
    },
    {
      id: 103,
      user_id: 9,
      name: 'Bicicleta de Montaña R29 Aluminio 21v',
      price: 5200.00,
      original_price: 6500.00,
      code: 'BICIR29',
      condition: 'nuevo',
      brand: 'Centurfit',
      model: 'Extreme R29',
      description: 'Bicicleta nueva en caja cerrada. Frenos de disco mecánico, suspensión delantera. Color negro/azul.',
      availability: 2,
      published_at: '2026-07-30',
      category_id: 5,
      category: 'Sports',
      category_es: 'Deportes',
      subcategory: 'Bicycles',
      subcategory_es: 'Bicicletas',
      status: 'moderated',
      currency: 'MXN',
      location: 'Guadalajara, Jal',
      images: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=60',
      images_list: [
        { file_name: 'bici_1.webp', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=60', is_primary: true, display_order: 0 },
      ],
      user: {
        user_id: 9,
        name: 'Juan Carlos',
        last_name: 'Pérez',
        username: 'jc_perez',
        email: 'jc.perez@mail.com',
      },
      email: 'jc.perez@mail.com',
      offers_count: 1,
    },
  ];

  private mockBuyers: BuyerProductListing[] = [
    {
      id: 201,
      user_id: 18,
      name: 'Busco Smart TV 55" o 65" 4K UHD',
      min_price: 6000.00,
      max_price: 9000.00,
      code: 'BUSCOTV',
      condition: 'usado',
      brand: 'Cualquiera',
      model: 'Reciente',
      description: 'Que sea Smart TV con apps funcionales (Netflix, YouTube). Pago inmediato en efectivo o transferencia. Preferencia Samsung o LG.',
      quantity: 1,
      published_at: '2026-08-02',
      category_id: 3,
      category: 'Electronics',
      category_es: 'Electrónica',
      subcategory: 'TVs',
      subcategory_es: 'Pantallas',
      status: 'active',
      currency: 'MXN',
      location: 'Querétaro, Qro',
      delivery_midpoint: true,
      delivery_home: false,
      delivery_pickup: true,
      limit_max_price: true,
      images: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60',
      images_list: [
        { file_name: 'tv_1.webp', url: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60', is_primary: true, display_order: 0 },
      ],
      user: {
        user_id: 18,
        name: 'Sofia',
        last_name: 'Martínez',
        username: 'sofi_mtz',
        email: 'sofia.mtz@mail.com',
      },
      email: 'sofia.mtz@mail.com',
      offers_count: 5,
    },
    {
      id: 202,
      user_id: 22,
      name: 'Compro Nintendo Switch Oled Completo',
      min_price: 4000.00,
      max_price: 5200.00,
      code: 'BUSCOSWITCH',
      condition: 'usado',
      brand: 'Nintendo',
      model: 'Oled',
      description: 'Busco consola Nintendo Switch versión OLED, con todos sus accesorios originales. Si tiene juegos o estuche podemos negociar un extra.',
      quantity: 1,
      published_at: '2026-08-03',
      category_id: 4,
      category: 'Consoles',
      category_es: 'Consolas',
      subcategory: 'Nintendo',
      subcategory_es: 'Nintendo',
      status: 'active',
      currency: 'MXN',
      location: 'Puebla, Pue',
      delivery_midpoint: true,
      delivery_home: true,
      delivery_pickup: false,
      limit_max_price: false,
      images: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60',
      images_list: [
        { file_name: 'switch_1.webp', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60', is_primary: true, display_order: 0 },
      ],
      user: {
        user_id: 22,
        name: 'Miguel',
        last_name: 'Herrera',
        username: 'mike_herrera',
        email: 'mike.herrera@mail.com',
      },
      email: 'mike.herrera@mail.com',
      offers_count: 2,
    },
  ];

  /**
   * Get Seller Products
   */
  getSellerListings(params: ListingAdminFilterParams): Observable<APIResponse<SellerProductListing[]>> {
    if (API_CONFIG.useMock) {
      let filtered = [...this.mockSellers];

      if (params.search?.trim()) {
        const query = params.search.trim().toLowerCase();
        filtered = filtered.filter((p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((p) => p.status === params.status);
      }

      if (params.user_id) {
        filtered = filtered.filter((p) => p.user_id === params.user_id);
      }

      const total = filtered.length;
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;
      const paginated = filtered.slice(offset, offset + limit);

      return of({
        code: 0,
        message: 'Success (Mock)',
        result: paginated,
        total,
      }).pipe(delay(400));
    }

    // Backend Request
    let httpParams = new HttpParams()
      .set('limit', (params.limit || 20).toString())
      .set('offset', (params.offset || 0).toString());

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status_filter', params.status);
    }
    if (params.user_id) {
      httpParams = httpParams.set('user_id', params.user_id.toString());
    }

    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.listingsSell}`;
    return this.http.get<APIResponse<SellerProductListing[]>>(url, { params: httpParams });
  }

  getSellerListingById(productId: number): Observable<APIResponse<SellerProductListing[]>> {
    if (API_CONFIG.useMock) {
      const item = this.mockSellers.find((p) => p.id === productId);
      return of({
        code: 0,
        message: 'Success (Mock)',
        result: item ? [item] : [],
        total: item ? 1 : 0,
      }).pipe(delay(200));
    }
    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.listingsSell}/${productId}`;
    return this.http.get<APIResponse<SellerProductListing[]>>(url);
  }

  /**
   * Get Buyer Products
   */
  getBuyerListings(params: ListingAdminFilterParams): Observable<APIResponse<BuyerProductListing[]>> {
    if (API_CONFIG.useMock) {
      let filtered = [...this.mockBuyers];

      if (params.search?.trim()) {
        const query = params.search.trim().toLowerCase();
        filtered = filtered.filter((p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((p) => p.status === params.status);
      }

      if (params.user_id) {
        filtered = filtered.filter((p) => p.user_id === params.user_id);
      }

      const total = filtered.length;
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;
      const paginated = filtered.slice(offset, offset + limit);

      return of({
        code: 0,
        message: 'Success (Mock)',
        result: paginated,
        total,
      }).pipe(delay(400));
    }

    // Backend Request
    let httpParams = new HttpParams()
      .set('limit', (params.limit || 20).toString())
      .set('offset', (params.offset || 0).toString());

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status_filter', params.status);
    }
    if (params.user_id) {
      httpParams = httpParams.set('user_id', params.user_id.toString());
    }

    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.listingsBuy}`;
    return this.http.get<APIResponse<BuyerProductListing[]>>(url, { params: httpParams });
  }

  getBuyerListingById(productId: number): Observable<APIResponse<BuyerProductListing[]>> {
    if (API_CONFIG.useMock) {
      const item = this.mockBuyers.find((p) => p.id === productId);
      return of({
        code: 0,
        message: 'Success (Mock)',
        result: item ? [item] : [],
        total: item ? 1 : 0,
      }).pipe(delay(200));
    }
    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.listingsBuy}/${productId}`;
    return this.http.get<APIResponse<BuyerProductListing[]>>(url);
  }

  /**
   * Update listing status (moderation)
   */
  updateListingStatus(
    type: 'seller' | 'buyer',
    productId: number,
    newStatus: ProductStatusType,
    reason?: string,
    notes?: string
  ): Observable<APIResponse<any>> {
    if (API_CONFIG.useMock) {
      if (type === 'seller') {
        const item = this.mockSellers.find((p) => p.id === productId);
        if (item) {
          item.status = newStatus;
        }
      } else {
        const item = this.mockBuyers.find((p) => p.id === productId);
        if (item) {
          item.status = newStatus;
        }
      }

      return of({
        code: 0,
        message: 'Success updated (Mock)',
        result: { id: productId, type, status: newStatus, reason, notes },
      }).pipe(delay(300));
    }

    // Backend request
    const url = `${API_CONFIG.baseUrl}/admin/listings/${type}/${productId}/status`;
    const body = {
      new_status: newStatus,
      reason: reason || null,
      notes: notes || null,
    };
    return this.http.patch<APIResponse<any>>(url, body);
  }

  /**
   * Get moderation history for a specific listing
   */
  getListingModerationHistory(
    type: 'seller' | 'buyer',
    productId: number
  ): Observable<APIResponse<ProductModerationLogItem[]>> {
    if (API_CONFIG.useMock) {
      return of({
        code: 0,
        message: 'Success (Mock)',
        result: [
          {
            id: 1,
            product_type: type.toUpperCase() as 'SELLER' | 'BUYER',
            product_id: productId,
            admin_id: 1,
            admin_name: 'Admin Sistema',
            action: 'MODERATE',
            previous_status: 'active',
            new_status: 'moderated',
            reason: 'Contenido Inapropiado',
            notes: 'Fotografía no cumple los lineamientos de calidad.',
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      }).pipe(delay(300));
    }

    const url = `${API_CONFIG.baseUrl}/admin/listings/${type}/${productId}/history`;
    return this.http.get<APIResponse<ProductModerationLogItem[]>>(url);
  }
}


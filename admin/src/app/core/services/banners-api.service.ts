import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import {
  BANNER_STATUS_ACTIVE,
  BANNER_STATUS_INACTIVE,
  BannerAdminItem,
  BannerCreatePayload,
  BannerUpdatePayload,
  BannerActionCatalogueItem,
  BannerActionCatalogueListResponse,
  BannerActionCataloguePayload,
} from '../models/banner.model';

const STORAGE_KEY = 'bms_hero_banners';

const INITIAL_BANNERS: BannerAdminItem[] = [
  {
    id: 1,
    title: 'Gimnasio & Fuerza',
    description: 'Atmósfera atlética de alto rendimiento',
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop',
    show_action: false,
    display_order: 1,
    status_id: BANNER_STATUS_ACTIVE,
    platform: 'all',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Velocidad & Pista',
    description: 'Sprint al atardecer en pista olímpica',
    image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2000&auto=format&fit=crop',
    show_action: false,
    display_order: 2,
    status_id: BANNER_STATUS_ACTIVE,
    platform: 'all',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Ciclismo de Ruta',
    description: 'Entrenamiento de resistencia y ruta',
    image_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=2000&auto=format&fit=crop',
    show_action: false,
    display_order: 3,
    status_id: BANNER_STATUS_ACTIVE,
    platform: 'all',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
  {
    id: 4,
    title: 'Cross Training & Funcional',
    description: 'Fuerza explosiva con kettlebells',
    image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2000&auto=format&fit=crop',
    show_action: false,
    display_order: 4,
    status_id: BANNER_STATUS_ACTIVE,
    platform: 'all',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
  {
    id: 5,
    title: 'Natación & Deportes Acuáticos',
    description: 'Técnica subacuática de alta competencia',
    image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2000&auto=format&fit=crop',
    show_action: false,
    display_order: 5,
    status_id: BANNER_STATUS_ACTIVE,
    platform: 'all',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
];

@Injectable({
  providedIn: 'root',
})
export class BannersApiService {
  private http = inject(HttpClient);
  private base = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.banners}`;

  private getStoredBanners(): BannerAdminItem[] {
    if (typeof window === 'undefined') return INITIAL_BANNERS;
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (!val) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BANNERS));
        return INITIAL_BANNERS;
      }
      return JSON.parse(val);
    } catch {
      return INITIAL_BANNERS;
    }
  }

  private saveStoredBanners(items: BannerAdminItem[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // storage quota or disabled
      }
    }
  }

  getList(): Observable<BannerAdminItem[]> {
    return this.http.get<BannerAdminItem[]>(`${this.base}/`).pipe(
      tap((items) => {
        if (items && items.length > 0) {
          this.saveStoredBanners(items);
        }
      }),
      catchError(() => {
        return of(this.getStoredBanners());
      })
    );
  }

  create(payload: BannerCreatePayload): Observable<BannerAdminItem> {
    const list = this.getStoredBanners();
    const newId = list.reduce((max, it) => Math.max(max, it.id), 0) + 1;
    const newItem: BannerAdminItem = {
      id: newId,
      title: payload.title,
      description: payload.description,
      title_en: payload.title_en,
      description_en: payload.description_en,
      image_url: payload.image_url,
      show_action: payload.show_action,
      action_text: payload.action_text,
      action_text_en: payload.action_text_en,
      action_url: payload.action_url,
      action_url_mobile: payload.action_url_mobile,
      display_order: payload.display_order,
      status_id: payload.status_id,
      for_user: payload.for_user,
      platform: payload.platform,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    list.unshift(newItem);
    this.saveStoredBanners(list);

    return this.http.post<BannerAdminItem>(`${this.base}/`, payload).pipe(
      tap((created) => {
        const idx = list.findIndex((x) => x.id === newId);
        if (idx >= 0 && created) {
          list[idx] = created;
          this.saveStoredBanners(list);
        }
      }),
      catchError(() => of(newItem))
    );
  }

  update(id: number, payload: BannerUpdatePayload): Observable<BannerAdminItem> {
    const list = this.getStoredBanners();
    const idx = list.findIndex((b) => b.id === id);
    let updatedItem: BannerAdminItem;

    if (idx >= 0) {
      updatedItem = {
        ...list[idx],
        ...payload,
        updated_date: new Date().toISOString(),
      } as BannerAdminItem;
      list[idx] = updatedItem;
      this.saveStoredBanners(list);
    } else {
      updatedItem = { id, ...payload } as any;
    }

    return this.http.put<BannerAdminItem>(`${this.base}/${id}`, payload).pipe(
      tap((res) => {
        if (res && idx >= 0) {
          list[idx] = res;
          this.saveStoredBanners(list);
        }
      }),
      catchError(() => of(updatedItem))
    );
  }

  /** Soft-delete / deactivate (status_id = 0). */
  deactivate(id: number): Observable<{ message: string; id: number }> {
    const list = this.getStoredBanners();
    const item = list.find((b) => b.id === id);
    if (item) {
      item.status_id = BANNER_STATUS_INACTIVE;
      item.updated_date = new Date().toISOString();
      this.saveStoredBanners(list);
    }

    return this.http.delete<{ message: string; id: number }>(`${this.base}/${id}`).pipe(
      catchError(() => of({ message: 'Banner desactivado correctamente', id }))
    );
  }

  getActionsCatalogue(): Observable<BannerActionCatalogueListResponse> {
    return this.http.get<BannerActionCatalogueListResponse>(`${this.base}/actions-catalogue`).pipe(
      catchError(() => of({ items: [] }))
    );
  }

  createActionCatalogue(payload: BannerActionCataloguePayload): Observable<BannerActionCatalogueItem> {
    const item: BannerActionCatalogueItem = {
      id: Date.now(),
      name: payload.name,
      description: payload.description,
      action_url: payload.action_url,
      action_url_mobile: payload.action_url_mobile,
    };
    return this.http.post<BannerActionCatalogueItem>(`${this.base}/actions-catalogue`, payload).pipe(
      catchError(() => of(item))
    );
  }

  updateActionCatalogue(
    id: number,
    payload: BannerActionCataloguePayload,
  ): Observable<BannerActionCatalogueItem> {
    const item: BannerActionCatalogueItem = {
      id,
      name: payload.name,
      description: payload.description,
      action_url: payload.action_url,
      action_url_mobile: payload.action_url_mobile,
    };
    return this.http.put<BannerActionCatalogueItem>(`${this.base}/actions-catalogue/${id}`, payload).pipe(
      catchError(() => of(item))
    );
  }

  deleteActionCatalogue(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.base}/actions-catalogue/${id}`).pipe(
      catchError(() => of({ message: 'Acción eliminada', id }))
    );
  }
}


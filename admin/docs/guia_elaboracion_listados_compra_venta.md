# Guía Paso a Paso: Construcción del Panel de Administración de Publicaciones (Compra y Venta)

Esta guía documenta en detalle la arquitectura, el diseño y los pasos de implementación para construir el panel de administración de **Publicaciones de Venta (`listings/sell`)** y **Publicaciones de Compra (`listings/buy`)** dentro de la aplicación de administración Angular de **Buyer1**.

---

## 1. Visión General de la Arquitectura

```mermaid
flowchart TD
    subgraph Frontend Angular (Admin)
        Routes["app.routes.ts"]
        Nav["MainLayoutComponent (Sidebar Nav)"]
        SellComponent["ListingsSellComponent (/listings/sell)"]
        BuyComponent["ListingsBuyComponent (/listings/buy)"]
        Service["ListingsService (signals + HttpClient)"]
        Models["listings.model.ts"]
    end

    subgraph Backend FastAPI
        AdminRoutes["app/api/v1/endpoints/admin_products.py"]
        ProductsRoutes["app/api/v1/endpoints/products.py"]
        Database[("MySQL / MariaDB")]
    end

    Nav --> Routes
    Routes --> SellComponent
    Routes --> BuyComponent
    SellComponent --> Service
    BuyComponent --> Service
    Service --> Models
    Service -- "HTTP GET/PATCH/DELETE (JWT Auth)" --> AdminRoutes
    AdminRoutes --> Database
    ProductsRoutes --> Database
```

---

## 2. Estructura de Archivos del Proyecto

Los componentes y servicios se organizan respetando la arquitectura por módulos de Angular 18 (Standalone Components + Signals + Tailwind CSS):

```
admin/
├── docs/
│   └── guia_elaboracion_listados_compra_venta.md  <-- [Este archivo]
└── src/
    └── app/
        ├── core/
        │   ├── models/
        │   │   └── listings.model.ts               <-- Interfaces y DTOs de TypeScript
        │   └── services/
        │       └── listings.service.ts             <-- Servicio HTTP de consumo de APIs
        └── features/
            └── listings/
                ├── sell/
                │   └── listings-sell.component.ts  <-- Panel de Administración de Venta
                └── buy/
                    └── listings-buy.component.ts   <-- Panel de Administración de Compra
```

---

## 3. Paso 1: Definición de Modelos e Interfaces TypeScript

Crear el archivo `admin/src/app/core/models/listings.model.ts` para definir las estructuras fuertemente tipadas de productos de venta, productos de compra, filtros y respuestas de la API.

### Código de `admin/src/app/core/models/listings.model.ts`:

```typescript
/**
 * Estado general de la publicación
 */
export type ProductStatusType = 'active' | 'inactive' | 'moderated' | 'deleted' | 'completed';

/**
 * Imagen de un producto
 */
export interface ProductImageItem {
  id?: number;
  file_name: string;
  url: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * Usuario propietario de la publicación
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
 * Publicación de Venta (Seller Product)
 */
export interface SellerProductListing {
  id: number;
  user_id: number;
  name: string;
  price: number;
  original_price?: number | null;
  code?: string;
  condition: string; // 'nuevo' | 'usado'
  brand?: string;
  model?: string;
  description: string;
  availability: number;
  published_at?: string;
  category_id: number;
  subcategory_id?: number | null;
  category?: string;
  category_es?: string;
  subcategory?: string;
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
 * Publicación de Compra / Solicitud de Compra (Buyer Product)
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
  category_es?: string;
  subcategory?: string;
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
 * Filtros de Búsqueda y Paginación para el Panel Administrativo
 */
export interface ListingAdminFilterParams {
  search?: string;
  status?: string; // 'all' | 'active' | 'inactive' | 'moderated' | 'deleted'
  category_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta genérica de API
 */
export interface APIResponse<T> {
  message: string;
  result: T;
  total?: number;
}
```

---

## 4. Paso 2: Endpoints Backend FastAPI (`app/api/v1/endpoints/admin_products.py`)

Para garantizar que el panel de administración tenga permisos de moderación completa (acceso a productos de cualquier usuario, filtrado por estado activo/inactivo/eliminado, y cambio de estado por administradores), se implementa la ruta administrativa en FastAPI respetando `require_administrator`.

### Código sugerido para Backend (`services/app/api/v1/endpoints/admin_products.py`):

```python
# app/api/v1/endpoints/admin_products.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_administrator
from app.models import ProductoComprar, ProductoVender
from app.schemas.base import APIResponse
from app.api.v1.endpoints.products import (
    _buyer_product_query,
    _seller_product_query,
    format_product
)

router = APIRouter()

@router.get("/seller", response_model=APIResponse[List[dict]])
def list_admin_seller_products(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query("all", description="all|active|inactive|moderated|deleted"),
    search: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_admin: dict = Depends(require_administrator)
):
    """
    Endpoint Admin: Retorna todas las publicaciones de VENTA de cualquier usuario con moderación.
    """
    query = db.query(ProductoVender)
    
    if status_filter and status_filter != "all":
        query = query.filter(ProductoVender.status == status_filter)
    if search:
        query = query.filter(ProductoVender.name.ilike(f"%{search}%"))
    if user_id:
        query = query.filter(ProductoVender.user_id == user_id)
        
    total_count = query.count()
    products = query.order_by(ProductoVender.id.desc()).offset(offset).limit(limit).all()
    
    result = [format_product(p, db=db) for p in products]
    return APIResponse(message="Success", result=result, total=total_count)


@router.get("/buyer", response_model=APIResponse[List[dict]])
def list_admin_buyer_products(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query("all", description="all|active|inactive|moderated|deleted"),
    search: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_admin: dict = Depends(require_administrator)
):
    """
    Endpoint Admin: Retorna todas las solicitudes de COMPRA de cualquier usuario con moderación.
    """
    query = db.query(ProductoComprar)
    
    if status_filter and status_filter != "all":
        query = query.filter(ProductoComprar.status == status_filter)
    if search:
        query = query.filter(ProductoComprar.name.ilike(f"%{search}%"))
    if user_id:
        query = query.filter(ProductoComprar.user_id == user_id)
        
    total_count = query.count()
    products = query.order_by(ProductoComprar.id.desc()).offset(offset).limit(limit).all()
    
    result = [format_product(p, db=db) for p in products]
    return APIResponse(message="Success", result=result, total=total_count)


@router.patch("/{type}/{product_id}/status")
def update_product_status_admin(
    type: str, # 'seller' o 'buyer'
    product_id: int,
    new_status: str = Query(..., description="active|inactive|moderated|deleted"),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(require_administrator)
):
    """
    Endpoint Admin: Cambia el estado de una publicación (Venta o Compra) por moderación.
    """
    model = ProductoVender if type == "seller" else ProductoComprar
    prod = db.query(model).filter(model.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
        
    prod.status = new_status
    db.commit()
    return {"message": "Estado actualizado correctamente", "id": product_id, "status": new_status}
```

---

## 5. Paso 3: Servicio de Angular (`ListingsService`)

Crear `admin/src/app/core/services/listings.service.ts` utilizando `HttpClient` e injectando el entorno configurado.

### Código de `admin/src/app/core/services/listings.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SellerProductListing,
  BuyerProductListing,
  ListingAdminFilterParams,
  APIResponse,
  ProductStatusType,
} from '../models/listings.model';

@Injectable({
  providedIn: 'root',
})
export class ListingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1`;

  /**
   * Obtener listado de publicaciones de VENTA
   */
  getSellerListings(params: ListingAdminFilterParams): Observable<APIResponse<SellerProductListing[]>> {
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

    return this.http.get<APIResponse<SellerProductListing[]>>(`${this.apiUrl}/admin/products/seller`, {
      params: httpParams,
    });
  }

  /**
   * Obtener listado de publicaciones de COMPRA
   */
  getBuyerListings(params: ListingAdminFilterParams): Observable<APIResponse<BuyerProductListing[]>> {
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

    return this.http.get<APIResponse<BuyerProductListing[]>>(`${this.apiUrl}/admin/products/buyer`, {
      params: httpParams,
    });
  }

  /**
   * Cambiar el estado de moderación de una publicación
   */
  updateListingStatus(
    type: 'seller' | 'buyer',
    productId: number,
    newStatus: ProductStatusType,
  ): Observable<{ message: string; id: number; status: string }> {
    return this.http.patch<{ message: string; id: number; status: string }>(
      `${this.apiUrl}/admin/products/${type}/${productId}/status`,
      {},
      { params: { new_status: newStatus } },
    );
  }
}
```

---

## 6. Paso 4: Componente del Panel de Venta (`ListingsSellComponent`)

Actualizar `admin/src/app/features/listings/sell/listings-sell.component.ts` para renderizar la tabla dinámica con badges de estado, buscador, filtros, modal de vista rápida y cambio de estado.

### Código de `admin/src/app/features/listings/sell/listings-sell.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { SellerProductListing, ProductStatusType } from '../../../core/models/listings.model';

@Component({
  selector: 'app-listings-sell',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="mx-auto max-w-7xl">
      <!-- Encabezado -->
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Publicaciones de Venta</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Administración y moderación de productos publicados por vendedores.
          </p>
        </div>
        <button
          type="button"
          (click)="loadData()"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus:ring-2 focus:ring-slate-900/20"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </header>

      <!-- Barra de Filtros -->
      <div class="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-600">Buscar por Título / Nombre</label>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="Ej. iPhone 13 Pro..."
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-600">Estado de Moderación</label>
          <select
            [(ngModel)]="selectedStatus"
            (change)="onSearch()"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="moderated">Moderados / Bloqueados</option>
            <option value="deleted">Eliminados</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            type="button"
            (click)="onSearch()"
            class="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (loading()) {
        <div class="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando publicaciones...</span>
          </div>
        </div>
      } @else if (listings().length === 0) {
        <!-- Estado Vacío -->
        <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5m-16.5 0l1.125-3.375a1.125 1.125 0 011.066-.75h11.118a1.125 1.125 0 011.066.75L20.25 7.5" />
          </svg>
          <h3 class="mt-4 text-base font-semibold text-slate-800">No se encontraron productos de venta</h3>
          <p class="mt-1 text-sm text-slate-500">Intenta modificar los filtros o el término de búsqueda.</p>
        </div>
      } @else {
        <!-- Tabla de Datos -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-6 py-4">Producto</th>
                  <th class="px-6 py-4">Vendedor</th>
                  <th class="px-6 py-4">Precio</th>
                  <th class="px-6 py-4">Stock</th>
                  <th class="px-6 py-4">Estado</th>
                  <th class="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of listings(); track item.id) {
                  <tr class="transition-colors hover:bg-slate-50/50">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <img
                          [src]="item.images || '/static/images/default_product.webp'"
                          alt=""
                          class="h-12 w-12 rounded-xl object-cover border border-slate-100 bg-slate-100"
                        />
                        <div>
                          <div class="font-semibold text-slate-900 line-clamp-1">{{ item.name }}</div>
                          <div class="text-xs text-slate-400">ID: #{{ item.id }} • {{ item.category_es || item.category || 'Sin categoría' }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-medium text-slate-800">{{ item.user?.name || 'Usuario' }} {{ item.user?.last_name || '' }}</div>
                      <div class="text-xs text-slate-400">{{ item.email || item.user?.email || 'N/A' }}</div>
                    </td>
                    <td class="px-6 py-4 font-semibold text-slate-900">
                      {{ item.price | currency : item.currency || 'MXN' : 'symbol' : '1.2-2' }}
                    </td>
                    <td class="px-6 py-4 text-slate-600">
                      {{ item.availability }} un.
                    </td>
                    <td class="px-6 py-4">
                      <span
                        [class]="getStatusBadgeClass(item.status)"
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      >
                        {{ item.status | uppercase }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          (click)="openDetail(item)"
                          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          title="Ver Detalle"
                        >
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="toggleModeration(item)"
                          class="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          title="Cambiar Estado de Moderación"
                        >
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Modal de Detalle Completo -->
      @if (selectedItem(); as detail) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-lg font-bold text-slate-900">Detalle de Publicación de Venta</h3>
              <button type="button" (click)="selectedItem.set(null)" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div class="mt-4 space-y-4">
              <div class="flex gap-4">
                <img [src]="detail.images || '/static/images/default_product.webp'" class="h-28 w-28 rounded-xl object-cover border" />
                <div>
                  <h4 class="text-lg font-semibold text-slate-900">{{ detail.name }}</h4>
                  <p class="text-sm font-semibold text-blue-600">{{ detail.price | currency : detail.currency || 'MXN' }}</p>
                  <p class="text-xs text-slate-500 mt-1">Categoría: {{ detail.category_es || detail.category }}</p>
                  <p class="text-xs text-slate-500">Marca / Modelo: {{ detail.brand || 'N/A' }} / {{ detail.model || 'N/A' }}</p>
                  <p class="text-xs text-slate-500">Ubicación: {{ detail.location || 'No especificada' }}</p>
                </div>
              </div>
              <div>
                <h5 class="text-xs font-bold uppercase text-slate-400 mb-1">Descripción</h5>
                <p class="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{{ detail.description || 'Sin descripción.' }}</p>
              </div>
            </div>
            <div class="mt-6 flex justify-end">
              <button type="button" (click)="selectedItem.set(null)" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ListingsSellComponent implements OnInit {
  listings = signal<SellerProductListing[]>([]);
  loading = signal<boolean>(false);
  selectedItem = signal<SellerProductListing | null>(null);

  searchQuery = '';
  selectedStatus = 'all';

  constructor(private listingsService: ListingsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.listingsService
      .getSellerListings({
        search: this.searchQuery,
        status: this.selectedStatus,
        limit: 50,
      })
      .subscribe({
        next: (res) => {
          this.listings.set(res.result || []);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar publicaciones de venta', err);
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.loadData();
  }

  openDetail(item: SellerProductListing): void {
    this.selectedItem.set(item);
  }

  toggleModeration(item: SellerProductListing): void {
    const nextStatus: ProductStatusType = item.status === 'active' ? 'moderated' : 'active';
    if (confirm(`¿Deseas cambiar el estado de la publicación "#${item.id}" a ${nextStatus.toUpperCase()}?`)) {
      this.listingsService.updateListingStatus('seller', item.id, nextStatus).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('Error actualizando estado', err),
      });
    }
  }

  getStatusBadgeClass(status: ProductStatusType): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'moderated':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'deleted':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  }
}
```

---

## 7. Paso 5: Componente del Panel de Compra (`ListingsBuyComponent`)

Actualizar `admin/src/app/features/listings/buy/listings-buy.component.ts` para renderizar las solicitudes de compra publicadas por los compradores con sus presupuestos min/max y métodos de entrega solicitados.

### Código de `admin/src/app/features/listings/buy/listings-buy.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { BuyerProductListing, ProductStatusType } from '../../../core/models/listings.model';

@Component({
  selector: 'app-listings-buy',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <div class="mx-auto max-w-7xl">
      <!-- Encabezado -->
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Publicaciones de Compra</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Administración de solicitudes de compra publicadas por compradores.
          </p>
        </div>
        <button
          type="button"
          (click)="loadData()"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
        >
          Actualizar
        </button>
      </header>

      <!-- Barra de Filtros -->
      <div class="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-600">Buscar por Producto Buscado</label>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="Ej. MacBook M1..."
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-600">Estado de Moderación</label>
          <select
            [(ngModel)]="selectedStatus"
            (change)="onSearch()"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="moderated">Moderados / Bloqueados</option>
            <option value="deleted">Eliminados</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            type="button"
            (click)="onSearch()"
            class="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (loading()) {
        <div class="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando solicitudes de compra...</span>
          </div>
        </div>
      } @else if (listings().length === 0) {
        <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <h3 class="text-base font-semibold text-slate-800">No hay solicitudes de compra</h3>
          <p class="mt-1 text-sm text-slate-500">Ajusta los criterios de búsqueda.</p>
        </div>
      } @else {
        <!-- Tabla de Datos -->
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-6 py-4">Solicitud</th>
                  <th class="px-6 py-4">Comprador</th>
                  <th class="px-6 py-4">Rango de Presupuesto</th>
                  <th class="px-6 py-4">Ofertas Recibidas</th>
                  <th class="px-6 py-4">Estado</th>
                  <th class="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of listings(); track item.id) {
                  <tr class="transition-colors hover:bg-slate-50/50">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <img
                          [src]="item.images || '/static/images/default_product.webp'"
                          alt=""
                          class="h-12 w-12 rounded-xl object-cover border border-slate-100 bg-slate-100"
                        />
                        <div>
                          <div class="font-semibold text-slate-900 line-clamp-1">{{ item.name }}</div>
                          <div class="text-xs text-slate-400">Cant: {{ item.quantity }} un. • ID: #{{ item.id }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-medium text-slate-800">{{ item.user?.name || 'Comprador' }}</div>
                      <div class="text-xs text-slate-400">{{ item.email || item.user?.email || 'N/A' }}</div>
                    </td>
                    <td class="px-6 py-4 font-semibold text-slate-900">
                      {{ item.min_price | currency : item.currency || 'MXN' }} - {{ item.max_price | currency : item.currency || 'MXN' }}
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {{ item.offers_count || 0 }} ofertas
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        [class]="getStatusBadgeClass(item.status)"
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      >
                        {{ item.status | uppercase }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          (click)="toggleModeration(item)"
                          class="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          title="Moderación"
                        >
                          Moderar
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class ListingsBuyComponent implements OnInit {
  listings = signal<BuyerProductListing[]>([]);
  loading = signal<boolean>(false);

  searchQuery = '';
  selectedStatus = 'all';

  constructor(private listingsService: ListingsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.listingsService
      .getBuyerListings({
        search: this.searchQuery,
        status: this.selectedStatus,
        limit: 50,
      })
      .subscribe({
        next: (res) => {
          this.listings.set(res.result || []);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar publicaciones de compra', err);
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.loadData();
  }

  toggleModeration(item: BuyerProductListing): void {
    const nextStatus: ProductStatusType = item.status === 'active' ? 'moderated' : 'active';
    if (confirm(`¿Deseas cambiar el estado de la solicitud "#${item.id}" a ${nextStatus.toUpperCase()}?`)) {
      this.listingsService.updateListingStatus('buyer', item.id, nextStatus).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('Error actualizando estado', err),
      });
    }
  }

  getStatusBadgeClass(status: ProductStatusType): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'moderated':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  }
}
```

---

## 8. Paso 6: Configuración de Rutas y Menú Principal

Las rutas en `admin/src/app/app.routes.ts` ya están mapeadas correctamente hacia los componentes de publicaciones:

```typescript
{
  path: 'listings/sell',
  loadComponent: () =>
    import('./features/listings/sell/listings-sell.component').then(
      (m) => m.ListingsSellComponent,
    ),
},
{
  path: 'listings/buy',
  loadComponent: () =>
    import('./features/listings/buy/listings-buy.component').then(
      (m) => m.ListingsBuyComponent,
    ),
}
```

Y en el menú lateral de `MainLayoutComponent` (`main-layout.component.html`), los enlaces permiten la navegación directa:

```html
<p class="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Publicaciones</p>
<a routerLink="/listings/sell" routerLinkActive="bg-blue-600/10 text-blue-400">Venta</a>
<a routerLink="/listings/buy" routerLinkActive="bg-blue-600/10 text-blue-400">Compra</a>
```

---

## 9. Paso 7: Plan de Pruebas y Verificación (QA)

1. **Prueba de Renderizado**:
   - Navegar a `/listings/sell` y `/listings/buy` en el navegador del administrador.
   - Confirmar que la tabla se renderice sin errores de consola.
2. **Prueba de Búsqueda y Filtros**:
   - Ingresar un texto en el buscador de la barra de herramientas y presionar Enter / Botón Aplicar.
   - Seleccionar filtro por estado (Activos, Moderados, Eliminados) y validar que se envíe el query param `status_filter`.
3. **Prueba de Moderación de Estado**:
   - Hacer clic en el botón de moderación en un elemento de la lista.
   - Confirmar en el modal de confirmación y verificar que el estado cambie visualmente en la tabla.
4. **Respuesta ante Fallos**:
   - Si la API responde con un código de error 401/403 (Sesión expirada), verificar la redirección automática al login gracias al guard `authGuard`.

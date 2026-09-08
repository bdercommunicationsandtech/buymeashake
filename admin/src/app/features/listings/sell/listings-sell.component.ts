import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { SellerProductListing, ProductStatusType, ProductModerationLogItem } from '../../../core/models/listings.model';
import { environment } from '../../../core/config/environment';

@Component({
  selector: 'app-listings-sell',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">

      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Publicaciones de Venta</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Administra, audita y rastrea el historial de moderación de productos de venta.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          @if (totalRecords() > 0) {
            <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {{ totalRecords() }} registros
            </span>
          }
          <button
            type="button"
            (click)="loadData()"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sincronizar
          </button>
        </div>
      </header>

      <nav class="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white/70 p-1 shadow-sm backdrop-blur-md w-fit" aria-label="Filtro de estado">
        @for (tab of statusTabs; track tab.value) {
          <button
            type="button"
            (click)="setStatusFilter(tab.value)"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer"
            [class.bg-indigo-600]="selectedStatus === tab.value"
            [class.text-white]="selectedStatus === tab.value"
            [class.text-slate-600]="selectedStatus !== tab.value"
            [class.hover:bg-slate-50]="selectedStatus !== tab.value"
          >
            {{ tab.label }}
          </button>
        }
      </nav>

      <div class="mb-6 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="Buscar por título, marca..."
            class="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-4 text-sm text-slate-800 shadow-sm backdrop-blur-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
            aria-label="Buscar publicación de venta"
          />
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          (click)="onSearch()"
        >
          Buscar
        </button>
      </div>

      @if (loading()) {
        <div class="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando publicaciones...</span>
          </div>
        </div>
      } @else if (listings().length === 0) {
        <div class="rounded-2xl border border-slate-100 bg-white/70 py-16 text-center shadow-sm backdrop-blur-md">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5m-16.5 0l1.125-3.375a1.125 1.125 0 011.066-.75h11.118a1.125 1.125 0 011.066.75L20.25 7.5" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-slate-800">No hay publicaciones</h3>
          <p class="mt-1 text-sm text-slate-500 max-w-xs mx-auto">No se encontraron productos que coincidan con los criterios actuales.</p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Lista de publicaciones de venta">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Producto</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Vendedor</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Precio</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ubicación</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of listings(); track item.id) {
                  <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                          <img
                            [src]="getImageUrl(item.images_list[0]?.url || item.images)"
                            alt="Producto"
                            class="h-full w-full object-cover"
                            (error)="$event.target.src=getImageUrl('/static/images/default_product.webp')"
                          />
                        </div>
                        <div class="min-w-0">
                          <button
                            type="button"
                            (click)="openDetail(item)"
                            class="font-semibold text-slate-800 hover:text-indigo-600 text-left outline-none cursor-pointer"
                          >
                            {{ item.name }}
                          </button>
                          <div class="text-xs text-slate-400 mt-0.5 font-mono">
                            #{{ item.id }} · {{ item.category_esp || item.category_es || item.category || 'Sin categoría' }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800">{{ item.user?.name }} {{ item.user?.last_name }}</div>
                      <div class="text-xs text-slate-500 mt-0.5">@{{ item.user?.username || 'vendedor' }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800">
                        {{ item.price | currency : item.currency || 'MXN' : 'symbol' : '1.2-2' }}
                      </div>
                      @if (item.availability > 1) {
                        <div class="text-xs text-slate-400 mt-0.5">{{ item.availability }} disponibles</div>
                      }
                    </td>
                    <td class="px-4 py-3 text-slate-600 font-medium">
                      {{ item.location || 'No especificada' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        [class]="getStatusBadgeClass(item.status)"
                        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1"
                      >
                        <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                        {{ getStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          (click)="openDetail(item)"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                          title="Ver ficha e historial"
                        >
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        @if (item.status === 'moderated') {
                          <button
                            type="button"
                            (click)="changeStatus(item, 'active')"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="Reactivar / aprobar"
                          >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        } @else {
                          <button
                            type="button"
                            (click)="changeStatus(item, 'moderated')"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Marcar como moderado"
                          >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>
                        }

                        <button
                          type="button"
                          (click)="changeStatus(item, 'deleted')"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer disabled:opacity-40"
                          [disabled]="item.status === 'deleted'"
                          title="Eliminar publicación"
                        >
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <div class="text-xs font-medium text-slate-500">
              Página {{ getPageNumber() }} · Mostrando {{ listings().length }} de {{ totalRecords() }}
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="offset() === 0"
                (click)="prevPage()"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                [disabled]="offset() + limit() >= totalRecords()"
                (click)="nextPage()"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      }

      @if (selectedItem(); as detail) {
        <div class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" (click)="selectedItem.set(null)"></div>

        <aside
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden rounded-l-2xl border-l border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-in"
          role="dialog"
          aria-label="Ficha de publicación"
        >
          <div class="flex items-center justify-between border-b border-slate-100/80 bg-white/60 px-5 py-4 backdrop-blur-md">
            <div>
              <h2 class="text-base font-bold text-slate-900">Ficha de Publicación</h2>
              <p class="text-xs text-slate-500 font-medium mt-0.5">ID #{{ detail.id }}</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              (click)="selectedItem.set(null)"
              aria-label="Cerrar"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 p-5 text-white shadow-lg">
              <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
              <div class="relative flex items-center gap-4">
                <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/20 shadow-inner ring-2 ring-white/30">
                  <img
                    [src]="getImageUrl(detail.images_list[0]?.url || detail.images)"
                    class="h-full w-full object-cover"
                    (error)="$event.target.src=getImageUrl('/static/images/default_product.webp')"
                    alt=""
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="truncate text-lg font-extrabold">{{ detail.name }}</h3>
                  <p class="truncate text-sm text-white/75">
                    {{ detail.price | currency : detail.currency || 'MXN' : 'symbol' : '1.2-2' }}
                  </p>
                </div>
                <span [class]="getStatusBadgeClass(detail.status)" class="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 bg-white/90">
                  {{ getStatusLabel(detail.status) }}
                </span>
              </div>
            </div>

            <div class="aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-sm">
              <img
                [src]="getImageUrl(detail.images_list[0]?.url || detail.images)"
                class="h-full w-full object-cover"
                (error)="$event.target.src=getImageUrl('/static/images/default_product.webp')"
                alt=""
              />
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
              <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Detalles</h4>
              </div>
              <div class="grid grid-cols-2 gap-4 p-4 text-sm">
                <div>
                  <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Condición</span>
                  <span class="font-semibold text-slate-800">{{ detail.condition || 'N/A' }}</span>
                </div>
                <div>
                  <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Marca</span>
                  <span class="font-semibold text-slate-800">{{ detail.brand || 'N/A' }}</span>
                </div>
                <div>
                  <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Modelo</span>
                  <span class="font-semibold text-slate-800">{{ detail.model || 'N/A' }}</span>
                </div>
                <div>
                  <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Categoría</span>
                  <span class="font-semibold text-slate-800">{{ detail.category_esp || detail.category_es || detail.category || 'N/A' }}</span>
                </div>
                <div class="col-span-2">
                  <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">Vendedor</span>
                  <span class="font-semibold text-slate-800">{{ detail.user?.name }} {{ detail.user?.last_name }}</span>
                </div>
              </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
              <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <svg class="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Historial de moderación</h4>
              </div>
              <div class="p-4">
                @if (loadingHistory()) {
                  <div class="py-4 text-center text-sm text-slate-400">Cargando registros...</div>
                } @else if (moderationHistory().length === 0) {
                  <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-center text-sm text-slate-400">
                    No hay eventos registrados para esta publicación.
                  </div>
                } @else {
                  <div class="space-y-3 pl-2 border-l-2 border-indigo-100">
                    @for (log of moderationHistory(); track log.id) {
                      <div class="relative pl-4 text-sm">
                        <span class="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-white"></span>
                        <div class="flex items-center justify-between font-semibold text-slate-800">
                          <span>{{ log.action }}</span>
                          <span class="text-xs text-slate-400 font-normal">{{ log.created_at | date:'short' }}</span>
                        </div>
                        <div class="text-xs text-slate-500 mt-0.5">Admin: {{ log.admin_name || 'ID #' + log.admin_id }}</div>
                        <div class="text-xs text-slate-600 mt-1">
                          <span class="font-mono text-slate-400">{{ log.previous_status }}</span>
                          →
                          <span class="font-mono font-bold text-slate-800">{{ log.new_status }}</span>
                        </div>
                        @if (log.reason) {
                          <div class="mt-1.5 inline-block rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            Motivo: {{ log.reason }}
                          </div>
                        }
                        @if (log.notes) {
                          <p class="mt-1.5 text-xs text-slate-500 italic rounded-lg border border-slate-100 bg-slate-50 p-2">
                            "{{ log.notes }}"
                          </p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 bg-white/60 px-5 py-4 backdrop-blur-md">
            <button
              type="button"
              (click)="selectedItem.set(null)"
              class="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </aside>
      }

      @if (confirmModal(); as modal) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div class="p-6 space-y-4">
              <div class="flex items-start gap-3">
                <div
                  [class]="modal.actionType === 'delete'
                    ? 'bg-rose-50 text-rose-600'
                    : modal.actionType === 'moderate'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'"
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                >
                  @if (modal.actionType === 'delete') {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  } @else if (modal.actionType === 'moderate') {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  } @else {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  }
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">{{ modal.title }}</h3>
                  <p class="mt-1 text-sm text-slate-500">{{ modal.message }}</p>
                </div>
              </div>

              @if (modal.actionType !== 'activate') {
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Motivo</label>
                    <select
                      [(ngModel)]="selectedReason"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      @for (r of predefinedReasons; track r) {
                        <option [value]="r">{{ r }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notas (opcional)</label>
                    <textarea
                      [(ngModel)]="customNotes"
                      rows="3"
                      placeholder="Detalles del administrador..."
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                    ></textarea>
                  </div>
                </div>
              }
            </div>
            <div class="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                (click)="closeConfirmModal()"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="executeConfirmedAction()"
                [class]="modal.actionType === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : modal.actionType === 'moderate'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'"
                class="rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition cursor-pointer"
              >
                Confirmar
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

  moderationHistory = signal<ProductModerationLogItem[]>([]);
  loadingHistory = signal<boolean>(false);

  selectedReason = 'Contenido Inapropiado';
  customNotes = '';
  predefinedReasons = [
    'Contenido Inapropiado',
    'Spam / Duplicado',
    'Precio Engañoso',
    'Producto Prohibido',
    'Fotografía Engañosa',
    'Solicitud del Usuario',
    'Violación de Políticas',
    'Otro',
  ];

  confirmModal = signal<{
    show: boolean;
    title: string;
    message: string;
    actionType: 'moderate' | 'delete' | 'activate';
    item: SellerProductListing | null;
    targetStatus: ProductStatusType;
  } | null>(null);

  searchQuery = '';
  selectedStatus = 'all';

  limit = signal<number>(10);
  offset = signal<number>(0);
  totalRecords = signal<number>(0);

  statusTabs = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'Inactivos', value: 'inactive' },
    { label: 'Moderados', value: 'moderated' },
    { label: 'Eliminados', value: 'deleted' },
  ];

  searchTimeout: any;
  private openingQueryId: number | null = null;

  private listingsService = inject(ListingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadData();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id < 1) return;
      this.openListingFromQuery(id);
    });
  }

  private clearQueryId(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private openListingFromQuery(id: number): void {
    if (this.openingQueryId === id && this.selectedItem()?.id === id) return;
    this.openingQueryId = id;

    const cached = this.listings().find((item) => item.id === id);
    if (cached) {
      this.openDetail(cached);
      this.clearQueryId();
      return;
    }

    this.listingsService.getSellerListingById(id).subscribe({
      next: (res) => {
        const item = Array.isArray(res.result) ? res.result[0] : null;
        if (item) {
          this.openDetail(item);
        }
        this.clearQueryId();
      },
      error: () => this.clearQueryId(),
    });
  }

  getImageUrl(url: string | undefined | null): string {
    if (!url) {
      return 'http://localhost:8001/static/images/default_product.webp';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    try {
      const origin = new URL(environment.apiBaseUrl).origin;
      return `${origin}/${url.replace(/^\//, '')}`;
    } catch {
      return `http://localhost:8001/${url.replace(/^\//, '')}`;
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.listingsService
      .getSellerListings({
        search: this.searchQuery,
        status: this.selectedStatus,
        limit: this.limit(),
        offset: this.offset(),
      })
      .subscribe({
        next: (res) => {
          this.listings.set(res.result || []);
          this.totalRecords.set(res.total || res.result?.length || 0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar publicaciones de venta', err);
          this.listings.set([]);
          this.totalRecords.set(0);
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.offset.set(0);
      this.loadData();
    }, 250);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.offset.set(0);
    this.loadData();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.offset.set(0);
    this.loadData();
  }

  getPageNumber(): number {
    return Math.floor(this.offset() / this.limit()) + 1;
  }

  nextPage(): void {
    const nextOffset = this.offset() + this.limit();
    if (nextOffset < this.totalRecords()) {
      this.offset.set(nextOffset);
      this.loadData();
    }
  }

  prevPage(): void {
    const prevOffset = this.offset() - this.limit();
    if (prevOffset >= 0) {
      this.offset.set(prevOffset);
      this.loadData();
    }
  }

  openDetail(item: SellerProductListing): void {
    this.selectedItem.set(item);
    this.loadHistory(item.id);
  }

  loadHistory(productId: number): void {
    this.loadingHistory.set(true);
    this.listingsService.getListingModerationHistory('seller', productId).subscribe({
      next: (res) => {
        this.moderationHistory.set(res.result || []);
        this.loadingHistory.set(false);
      },
      error: (err) => {
        console.error('Error al obtener historial de moderación', err);
        this.moderationHistory.set([]);
        this.loadingHistory.set(false);
      },
    });
  }

  changeStatus(item: SellerProductListing, newStatus: ProductStatusType): void {
    let actionType: 'delete' | 'moderate' | 'activate' = 'moderate';
    let title = 'Confirmar Moderación';
    let message = `¿Deseas cambiar el estado de la publicación #${item.id} a "MODERADO"?`;

    if (newStatus === 'deleted') {
      actionType = 'delete';
      title = 'Confirmar Eliminación';
      message = `¿Deseas marcar la publicación #${item.id} ("${item.name}") como "ELIMINADO"?`;
    } else if (newStatus === 'active') {
      actionType = 'activate';
      title = 'Aprobar Publicación';
      message = `¿Deseas aprobar y activar la publicación #${item.id} para que vuelva a ser visible públicamente?`;
    }

    this.selectedReason = 'Contenido Inapropiado';
    this.customNotes = '';

    this.confirmModal.set({
      show: true,
      title,
      message,
      actionType,
      item,
      targetStatus: newStatus,
    });
  }

  closeConfirmModal(): void {
    this.confirmModal.set(null);
  }

  executeConfirmedAction(): void {
    const modal = this.confirmModal();
    if (!modal || !modal.item) return;

    const itemId = modal.item.id;
    const targetStatus = modal.targetStatus;
    const reason = modal.actionType === 'activate' ? 'Aprobación / Reactivación' : this.selectedReason;
    const notes = this.customNotes.trim() || undefined;

    this.listingsService
      .updateListingStatus('seller', itemId, targetStatus, reason, notes)
      .subscribe({
        next: () => {
          this.loadData();
          if (this.selectedItem()?.id === itemId) {
            this.selectedItem.update((curr) => (curr ? { ...curr, status: targetStatus } : null));
            this.loadHistory(itemId);
          }
          this.closeConfirmModal();
        },
        error: (err) => {
          console.error('Error al actualizar estado del producto', err);
          this.closeConfirmModal();
        },
      });
  }

  getStatusLabel(status: ProductStatusType): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'moderated': return 'Moderado';
      case 'deleted': return 'Eliminado';
      case 'reserved': return 'Reservado';
      case 'completed': return 'Vendido';
      default: return status;
    }
  }

  getStatusBadgeClass(status: ProductStatusType): string {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'inactive': return 'bg-slate-100 text-slate-600 ring-slate-200';
      case 'moderated': return 'bg-amber-50 text-amber-700 ring-amber-200';
      case 'deleted': return 'bg-rose-50 text-rose-700 ring-rose-200';
      case 'reserved': return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
      case 'completed': return 'bg-blue-50 text-blue-700 ring-blue-200';
      default: return 'bg-slate-100 text-slate-600 ring-slate-200';
    }
  }
}

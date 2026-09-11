import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { API_CONFIG } from '../../core/config/api.config';
import { BannersApiService } from '../../core/services/banners-api.service';
import {
  BANNER_STATUS_ACTIVE,
  BANNER_STATUS_INACTIVE,
  BannerAdminItem,
  BannerActionCatalogueItem,
  BannerActionCatalogueFormState,
  BannerFormState,
} from '../../core/models/banner.model';

type BannersTab = 'banners' | 'catalogue';

@Component({
  selector: 'app-banners-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">

      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Banners</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">Gestión de banners promocionales y destinos de acción</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          @if (activeTab() === 'banners' && banners().length > 0) {
            <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {{ banners().length }} registros
            </span>
          }
          @if (activeTab() === 'catalogue' && actionsCatalogue().length > 0) {
            <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {{ actionsCatalogue().length }} acciones
            </span>
          }
          @if (activeTab() === 'banners') {
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none cursor-pointer disabled:opacity-60"
              [disabled]="actionLoading()"
              (click)="openCreate()"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
              Agregar banner
            </button>
          } @else {
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none cursor-pointer disabled:opacity-60"
              [disabled]="catalogueLoading()"
              (click)="openCreateCatalogueAction()"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
              Agregar acción
            </button>
          }
        </div>
      </header>

      <nav class="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white/70 p-1 shadow-sm backdrop-blur-md w-fit" aria-label="Secciones de banners">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer"
          [class.bg-indigo-600]="activeTab() === 'banners'"
          [class.text-white]="activeTab() === 'banners'"
          [class.text-slate-600]="activeTab() !== 'banners'"
          [class.hover:bg-slate-50]="activeTab() !== 'banners'"
          (click)="setTab('banners')"
        >
          Banners
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer"
          [class.bg-indigo-600]="activeTab() === 'catalogue'"
          [class.text-white]="activeTab() === 'catalogue'"
          [class.text-slate-600]="activeTab() !== 'catalogue'"
          [class.hover:bg-slate-50]="activeTab() !== 'catalogue'"
          (click)="setTab('catalogue')"
        >
          Catálogo de acciones
        </button>
      </nav>

      @if (success()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          {{ success() }}
        </div>
      }

      @if (error()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {{ error() }}
        </div>
      }

      @if (activeTab() === 'banners') {
        <div class="relative flex flex-col gap-4">
          @if (actionLoading() && !modalOpen()) {
            <div class="absolute inset-0 z-10 flex min-h-[240px] items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm" role="status">
              <div class="flex flex-col items-center gap-3">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <span class="text-sm font-medium text-slate-500">{{ actionMessage() }}</span>
              </div>
            </div>
          }

          <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
            <div class="overflow-x-auto">
              <table class="w-full text-sm" aria-label="Gestión de banners">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/80">
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Imagen</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Título</th>
                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Plataforma</th>
                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Orden</th>
                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of banners(); track b.id) {
                    <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                      <td class="px-6 py-4 text-xs font-mono text-slate-400">#{{ b.id }}</td>
                      <td class="px-6 py-4">
                        @if (b.image_url) {
                          <img
                            [src]="bannerImageSrc(b.image_url)"
                            alt=""
                            class="h-12 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                            (error)="$any($event.target).style.opacity='0.3'"
                          />
                        } @else {
                          <span class="text-xs text-slate-400 italic">Sin imagen</span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        <div class="font-bold text-slate-800">{{ b.title || 'Sin título' }}</div>
                        <div class="text-slate-500 text-xs mt-0.5 leading-relaxed max-w-sm line-clamp-2">{{ b.description }}</div>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <span class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                          {{ platformLabel(b.platform) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-center text-slate-700 font-medium">{{ b.display_order }}</td>
                      <td class="px-6 py-4 text-center">
                        @if (b.status_id === activeStatusId) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                            Activo
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                            Inactivo
                          </span>
                        }
                      </td>
                      <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer disabled:opacity-40"
                            title="Editar"
                            [disabled]="actionLoading()"
                            (click)="openEdit(b)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                          </button>
                          @if (b.status_id === activeStatusId) {
                            <button
                              type="button"
                              class="inline-flex items-center justify-center rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer disabled:opacity-40"
                              title="Desactivar"
                              [disabled]="actionLoading()"
                              (click)="deactivate(b.id)"
                            >
                              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                              </svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-6 py-16 text-center text-sm italic text-slate-400">
                        @if (loading()) {
                          Cargando banners...
                        } @else {
                          No se encontraron banners configurados
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      @if (activeTab() === 'catalogue') {
        <div class="relative flex flex-col gap-4">
          @if (catalogueLoading() && !catalogueModalOpen()) {
            <div class="absolute inset-0 z-10 flex min-h-[240px] items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm" role="status">
              <div class="flex flex-col items-center gap-3">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <span class="text-sm font-medium text-slate-500">Procesando acción...</span>
              </div>
            </div>
          }

          <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
            <div class="overflow-x-auto">
              <table class="w-full text-sm" aria-label="Catálogo de acciones de banner">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/80">
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">URL web</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">URL mobile</th>
                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of actionsCatalogue(); track a.id) {
                    <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                      <td class="px-6 py-4 text-xs font-mono text-slate-400">#{{ a.id }}</td>
                      <td class="px-6 py-4">
                        <div class="font-bold text-slate-800">{{ a.name }}</div>
                        @if (a.description) {
                          <div class="text-slate-500 text-xs mt-0.5 leading-relaxed max-w-sm line-clamp-2">{{ a.description }}</div>
                        }
                      </td>
                      <td class="px-6 py-4">
                        <code class="text-xs text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded ring-1 ring-slate-100">
                          {{ a.action_url || '—' }}
                        </code>
                      </td>
                      <td class="px-6 py-4">
                        <code class="text-xs text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded ring-1 ring-slate-100">
                          {{ a.action_url_mobile || '—' }}
                        </code>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer disabled:opacity-40"
                            title="Editar"
                            [disabled]="catalogueLoading()"
                            (click)="openEditCatalogueAction(a)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer disabled:opacity-40"
                            title="Eliminar"
                            [disabled]="catalogueLoading()"
                            (click)="deleteCatalogueAction(a.id)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 112 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-6 py-16 text-center text-sm italic text-slate-400">
                        No hay acciones en el catálogo. Agrega una o ejecuta la migración de seeds.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      @if (modalOpen()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4 border border-slate-100">
            @if (actionLoading()) {
              <div class="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm" role="status">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <span class="text-sm font-medium text-slate-500">{{ actionMessage() }}</span>
                </div>
              </div>
            }

            <header class="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 class="text-xl font-bold text-slate-900">
                {{ isEditing() ? 'Editar banner #' + current()?.id : 'Nuevo banner' }}
              </h2>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
                [disabled]="actionLoading()"
                (click)="closeModal()"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </header>

            <form class="flex flex-col gap-4" (ngSubmit)="save()">
              <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold text-slate-700">Español</h3>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título</label>
                  <input
                    name="title"
                    type="text"
                    required
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.title"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                  <textarea
                    name="description"
                    required
                    rows="2"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.description"
                  ></textarea>
                </div>
              </div>

              <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold text-slate-700">Inglés (opcional)</h3>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título</label>
                  <input
                    name="title_en"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.title_en"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                  <textarea
                    name="description_en"
                    rows="2"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.description_en"
                  ></textarea>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Imagen</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  class="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
                  [disabled]="imageLoading()"
                  (change)="onImageSelected($event)"
                />
                <div class="relative mt-3 min-h-[6rem] max-w-xs">
                  @if (imageLoading()) {
                    <div class="flex h-24 items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40">
                      <span class="text-xs font-medium text-indigo-600">Procesando imagen...</span>
                    </div>
                  } @else if (form.image_url) {
                    <img
                      [src]="bannerImageSrc(form.image_url)"
                      alt="Vista previa"
                      class="h-24 w-full rounded-xl object-cover ring-1 ring-slate-200"
                    />
                  }
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Plataforma</label>
                  <select
                    name="platform"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.platform"
                  >
                    <option value="all">Todas</option>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Orden</label>
                  <input
                    name="display_order"
                    type="number"
                    min="0"
                    required
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.display_order"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Audiencia</label>
                  <input
                    name="for_user"
                    type="text"
                    placeholder="all"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.for_user"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Estado</label>
                  <select
                    name="status_id"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                    [(ngModel)]="form.status_id"
                  >
                    <option [ngValue]="activeStatusId">Activo</option>
                    <option [ngValue]="inactiveStatusId">Inactivo</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input
                  id="banner-show-action"
                  name="show_action"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  [(ngModel)]="form.show_action"
                />
                <label for="banner-show-action" class="text-sm font-medium text-slate-700">Mostrar botón de acción</label>
              </div>

              @if (form.show_action) {
                <div class="grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Texto acción (ES)</label>
                    <input
                      name="action_text"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                      [(ngModel)]="form.action_text"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Texto acción (EN)</label>
                    <input
                      name="action_text_en"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                      [(ngModel)]="form.action_text_en"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">URL de acción (web)</label>
                    <select
                      name="action_url"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition bg-white"
                      [(ngModel)]="form.action_url"
                    >
                      <option [ngValue]="''">Ninguno</option>
                      @for (a of bannerActionOptionsWeb; track a.id) {
                        <option [ngValue]="a.action_url || ''">{{ a.name }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">URL de acción (mobile)</label>
                    <select
                      name="action_url_mobile"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition bg-white"
                      [(ngModel)]="form.action_url_mobile"
                    >
                      <option [ngValue]="''">Ninguno</option>
                      @for (a of bannerActionOptionsMobile; track a.id) {
                        <option [ngValue]="a.action_url_mobile || ''">{{ a.name }}</option>
                      }
                    </select>
                  </div>
                </div>
              }

              <footer class="flex justify-end gap-3 mt-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition cursor-pointer disabled:opacity-60"
                  [disabled]="actionLoading() || imageLoading()"
                  (click)="closeModal()"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-60"
                  [disabled]="actionLoading() || imageLoading()"
                >
                  @if (actionLoading()) {
                    <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  }
                  {{ isEditing() ? 'Guardar cambios' : 'Crear banner' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      @if (catalogueModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4 border border-slate-100">
            @if (catalogueLoading()) {
              <div class="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm" role="status">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <span class="text-sm font-medium text-slate-500">Guardando...</span>
                </div>
              </div>
            }

            <header class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 class="text-xl font-bold text-slate-900">
                {{ isEditingCatalogue() ? 'Editar acción #' + currentCatalogue()?.id : 'Nueva acción' }}
              </h2>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
                [disabled]="catalogueLoading()"
                (click)="closeCatalogueModal()"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </header>

            <form class="flex flex-col gap-4" (ngSubmit)="saveCatalogueAction()">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre</label>
                <input
                  name="cat_name"
                  type="text"
                  required
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  [(ngModel)]="formCatalogue.name"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                <textarea
                  name="cat_description"
                  rows="2"
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  [(ngModel)]="formCatalogue.description"
                ></textarea>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">URL web</label>
                <input
                  name="cat_action_url"
                  type="text"
                  placeholder="/explore, /auth/register, /..."
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  [(ngModel)]="formCatalogue.action_url"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">URL mobile</label>
                <input
                  name="cat_action_url_mobile"
                  type="text"
                  placeholder="/explore, /auth/register, /..."
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  [(ngModel)]="formCatalogue.action_url_mobile"
                />
              </div>

              <footer class="flex justify-end gap-3 mt-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition cursor-pointer disabled:opacity-60"
                  [disabled]="catalogueLoading()"
                  (click)="closeCatalogueModal()"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-60"
                  [disabled]="catalogueLoading()"
                >
                  @if (catalogueLoading()) {
                    <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  }
                  {{ isEditingCatalogue() ? 'Guardar cambios' : 'Crear acción' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class BannersPanelComponent implements OnInit {
  readonly activeStatusId = BANNER_STATUS_ACTIVE;
  readonly inactiveStatusId = BANNER_STATUS_INACTIVE;

  activeTab = signal<BannersTab>('banners');
  banners = signal<BannerAdminItem[]>([]);
  actionsCatalogue = signal<BannerActionCatalogueItem[]>([]);
  loading = signal(false);
  actionLoading = signal(false);
  actionMessage = signal('');
  imageLoading = signal(false);
  catalogueLoading = signal(false);
  error = signal('');
  success = signal('');

  modalOpen = signal(false);
  isEditing = signal(false);
  current = signal<BannerAdminItem | null>(null);

  catalogueModalOpen = signal(false);
  isEditingCatalogue = signal(false);
  currentCatalogue = signal<BannerActionCatalogueItem | null>(null);

  form: BannerFormState = this.defaultForm();
  formCatalogue: BannerActionCatalogueFormState = this.defaultFormCatalogue();

  constructor(private api: BannersApiService) {}

  ngOnInit(): void {
    this.load();
    this.loadActionsCatalogue();
  }

  setTab(tab: BannersTab): void {
    this.activeTab.set(tab);
    this.error.set('');
    if (tab === 'catalogue' && !this.actionsCatalogue().length) {
      this.loadActionsCatalogue();
    }
  }

  /** Web select options + synthetic row for legacy URLs not in catalogue. */
  get bannerActionOptionsWeb(): BannerActionCatalogueItem[] {
    const catalogue = this.actionsCatalogue().filter((a) => !!a.action_url?.trim());
    const current = this.form.action_url.trim();
    if (current && !catalogue.some((a) => (a.action_url || '').trim() === current)) {
      return [
        ...catalogue,
        {
          id: -1,
          name: `Actual: ${current}`,
          description: null,
          action_url: current,
          action_url_mobile: null,
        },
      ];
    }
    return catalogue;
  }

  /** Mobile select options + synthetic row for legacy URLs not in catalogue. */
  get bannerActionOptionsMobile(): BannerActionCatalogueItem[] {
    const catalogue = this.actionsCatalogue().filter((a) => !!a.action_url_mobile?.trim());
    const current = this.form.action_url_mobile.trim();
    if (current && !catalogue.some((a) => (a.action_url_mobile || '').trim() === current)) {
      return [
        ...catalogue,
        {
          id: -2,
          name: `Actual: ${current}`,
          description: null,
          action_url: null,
          action_url_mobile: current,
        },
      ];
    }
    return catalogue;
  }

  private defaultForm(): BannerFormState {
    return {
      title: '',
      description: '',
      title_en: '',
      description_en: '',
      image_url: '',
      show_action: true,
      action_text: '',
      action_text_en: '',
      action_url: '',
      action_url_mobile: '',
      display_order: 0,
      status_id: BANNER_STATUS_ACTIVE,
      for_user: 'all',
      platform: 'all',
    };
  }

  private defaultFormCatalogue(): BannerActionCatalogueFormState {
    return {
      name: '',
      description: '',
      action_url: '',
      action_url_mobile: '',
    };
  }

  private loadActionsCatalogue(): void {
    this.api.getActionsCatalogue().subscribe({
      next: (res) => this.actionsCatalogue.set(res?.items || []),
      error: () => this.actionsCatalogue.set([]),
    });
  }

  private startAction(message: string): void {
    this.actionLoading.set(true);
    this.actionMessage.set(message);
  }

  private endAction(): void {
    this.actionLoading.set(false);
    this.actionMessage.set('');
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.startAction('Actualizando lista...');
    this.api.getList().subscribe({
      next: (items) => {
        this.banners.set(items || []);
        this.loading.set(false);
        this.endAction();
      },
      error: (err) => {
        this.loading.set(false);
        this.endAction();
        this.error.set(err?.error?.detail || 'Error al cargar banners');
      },
    });
  }

  openCreate(): void {
    this.isEditing.set(false);
    this.current.set(null);
    this.form = this.defaultForm();
    if (!this.actionsCatalogue().length) this.loadActionsCatalogue();
    this.modalOpen.set(true);
  }

  openEdit(b: BannerAdminItem): void {
    this.isEditing.set(true);
    this.current.set(b);
    this.form = {
      title: b.title || '',
      description: b.description || '',
      title_en: b.title_en || '',
      description_en: b.description_en || '',
      image_url: b.image_url || '',
      show_action: !!b.show_action,
      action_text: b.action_text || '',
      action_text_en: b.action_text_en || '',
      action_url: b.action_url || '',
      action_url_mobile: b.action_url_mobile || '',
      display_order: b.display_order ?? 0,
      status_id: b.status_id ?? BANNER_STATUS_ACTIVE,
      for_user: b.for_user || 'all',
      platform: b.platform || 'all',
    };
    if (!this.actionsCatalogue().length) this.loadActionsCatalogue();
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.actionLoading()) return;
    this.modalOpen.set(false);
    this.current.set(null);
    this.imageLoading.set(false);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageLoading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.imageLoading.set(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            this.form.image_url = canvas.toDataURL('image/webp', 0.8);
          } else {
            this.form.image_url = reader.result as string;
          }
        } catch {
          this.form.image_url = reader.result as string;
        }
        this.imageLoading.set(false);
      };
      img.onerror = () => {
        this.error.set('No se pudo procesar la imagen seleccionada.');
        this.imageLoading.set(false);
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      this.error.set('No se pudo leer la imagen seleccionada.');
      this.imageLoading.set(false);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  private buildPayload() {
    const showAction = this.form.show_action;
    return {
      title: this.form.title.trim() || null,
      description: this.form.description.trim() || null,
      title_en: this.form.title_en.trim() || null,
      description_en: this.form.description_en.trim() || null,
      image_url: this.form.image_url.trim(),
      show_action: showAction,
      action_text: showAction ? this.form.action_text.trim() || null : null,
      action_text_en: showAction ? this.form.action_text_en.trim() || null : null,
      action_url: showAction ? this.form.action_url.trim() || null : null,
      action_url_mobile: showAction ? this.form.action_url_mobile.trim() || null : null,
      display_order: Number(this.form.display_order) || 0,
      status_id: Number(this.form.status_id),
      for_user: this.form.for_user.trim() || 'all',
      platform: this.form.platform || 'all',
    };
  }

  save(): void {
    this.error.set('');
    this.success.set('');

    if (!this.form.image_url.trim()) {
      this.error.set('La imagen es obligatoria.');
      return;
    }

    this.startAction('Guardando banner...');
    const payload = this.buildPayload();

    if (this.isEditing()) {
      const id = this.current()?.id;
      if (!id) {
        this.endAction();
        return;
      }
      this.api.update(id, payload).subscribe({
        next: () => {
          this.success.set('Banner actualizado con éxito.');
          this.modalOpen.set(false);
          this.current.set(null);
          this.imageLoading.set(false);
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Error al actualizar el banner.');
          this.endAction();
        },
      });
    } else {
      this.api.create(payload).subscribe({
        next: () => {
          this.success.set('Banner creado con éxito.');
          this.modalOpen.set(false);
          this.current.set(null);
          this.imageLoading.set(false);
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Error al crear el banner.');
          this.endAction();
        },
      });
    }
  }

  deactivate(id: number): void {
    if (!confirm('¿Está seguro de que desea desactivar este banner?')) return;
    this.error.set('');
    this.success.set('');
    this.startAction('Desactivando banner...');
    this.api.deactivate(id).subscribe({
      next: () => {
        this.success.set('Banner desactivado con éxito.');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Error al desactivar el banner.');
        this.endAction();
      },
    });
  }

  // --- Catalogue CRUD ---

  openCreateCatalogueAction(): void {
    this.isEditingCatalogue.set(false);
    this.currentCatalogue.set(null);
    this.formCatalogue = this.defaultFormCatalogue();
    this.catalogueModalOpen.set(true);
  }

  openEditCatalogueAction(item: BannerActionCatalogueItem): void {
    this.isEditingCatalogue.set(true);
    this.currentCatalogue.set(item);
    this.formCatalogue = {
      name: item.name || '',
      description: item.description || '',
      action_url: item.action_url || '',
      action_url_mobile: item.action_url_mobile || '',
    };
    this.catalogueModalOpen.set(true);
  }

  closeCatalogueModal(): void {
    if (this.catalogueLoading()) return;
    this.catalogueModalOpen.set(false);
    this.currentCatalogue.set(null);
  }

  private buildCataloguePayload() {
    return {
      name: this.formCatalogue.name.trim(),
      description: this.formCatalogue.description.trim() || null,
      action_url: this.formCatalogue.action_url.trim() || null,
      action_url_mobile: this.formCatalogue.action_url_mobile.trim() || null,
    };
  }

  saveCatalogueAction(): void {
    const payload = this.buildCataloguePayload();
    if (!payload.name) {
      this.error.set('El nombre de la acción es obligatorio.');
      return;
    }

    this.error.set('');
    this.success.set('');
    this.catalogueLoading.set(true);

    if (this.isEditingCatalogue()) {
      const actionId = this.currentCatalogue()?.id;
      if (!actionId) {
        this.catalogueLoading.set(false);
        return;
      }
      this.api.updateActionCatalogue(actionId, payload).subscribe({
        next: () => {
          this.success.set('Acción actualizada con éxito.');
          this.catalogueModalOpen.set(false);
          this.currentCatalogue.set(null);
          this.catalogueLoading.set(false);
          this.loadActionsCatalogue();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Error al actualizar la acción.');
          this.catalogueLoading.set(false);
        },
      });
    } else {
      this.api.createActionCatalogue(payload).subscribe({
        next: () => {
          this.success.set('Acción creada con éxito.');
          this.catalogueModalOpen.set(false);
          this.currentCatalogue.set(null);
          this.catalogueLoading.set(false);
          this.loadActionsCatalogue();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Error al crear la acción.');
          this.catalogueLoading.set(false);
        },
      });
    }
  }

  deleteCatalogueAction(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar esta acción del catálogo?')) return;
    this.error.set('');
    this.success.set('');
    this.catalogueLoading.set(true);
    this.api.deleteActionCatalogue(id).subscribe({
      next: () => {
        this.success.set('Acción eliminada con éxito.');
        this.catalogueLoading.set(false);
        this.loadActionsCatalogue();
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Error al eliminar la acción.');
        this.catalogueLoading.set(false);
      },
    });
  }

  bannerImageSrc(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 50) {
      let mime = 'image/png';
      if (trimmed.startsWith('/9j/')) mime = 'image/jpeg';
      else if (trimmed.startsWith('R0lG')) mime = 'image/gif';
      else if (trimmed.startsWith('UklG')) mime = 'image/webp';
      return `data:${mime};base64,${trimmed}`;
    }
    const origin = API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  }

  platformLabel(platform: string): string {
    const map: Record<string, string> = { mobile: 'Mobile', web: 'Web', all: 'Todas' };
    return map[platform] ?? platform;
  }
}

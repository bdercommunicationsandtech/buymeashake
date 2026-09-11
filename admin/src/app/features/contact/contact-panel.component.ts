import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { API_CONFIG } from '../../core/config/api.config';
import { ContactApiService } from '../../core/services/contact-api.service';
import { extractApiErrorMessage } from '../../shared/utils/api-error.util';
import {
  CONTACT_READ_FILTER_OPTIONS,
  CONTACT_STATUS_FILTER_OPTIONS,
  ContactReadFilter,
  ContactStatusFilter,
  ContactTicket,
} from '../../core/models/contact-ticket.model';

@Component({
  selector: 'app-contact-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">

      <!-- Header Section -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-blue-600"></span>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Helpdesk & Support</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Mesa de Ayuda & Tickets</h2>
          <p class="mt-1 text-sm text-slate-500">
            Mensajes, dudas de pagos y solicitudes de asistencia de atletas y fans en BuyMeAShake.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          @if (!loading()) {
            @if (unreadCount() > 0) {
              <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {{ unreadCount() }} sin leer
              </span>
            }
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              @if (hasActiveFilters()) {
                {{ filteredTickets().length }} de {{ total() }} tickets
              } @else {
                {{ total() }} tickets
              }
            </span>
          }

          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 hover:text-blue-800 focus:outline-none cursor-pointer"
              title="Restablecer filtros"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Limpiar filtros
            </button>
          }

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer disabled:opacity-60"
            [disabled]="loading()"
            (click)="reload()"
          >
            <svg class="h-4 w-4 text-slate-500" [class.animate-spin]="loading()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Filter Read -->
        <div>
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Lectura</label>
          <select
            [ngModel]="readFilter()"
            (ngModelChange)="onReadFilterChange($event)"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            @for (opt of readFilterOptions; track opt.value) {
              <option [ngValue]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <!-- Filter Status -->
        <div>
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Estado de Atención</label>
          <select
            [ngModel]="statusFilter()"
            (ngModelChange)="onStatusFilterChange($event)"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            @for (opt of statusFilterOptions; track opt.value) {
              <option [ngValue]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <!-- Filter Role -->
        <div>
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Rol del Remitente</label>
          <select
            [ngModel]="roleFilter()"
            (ngModelChange)="onRoleFilterChange($event)"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos los roles</option>
            <option value="athlete">Atletas</option>
            <option value="supporter">Supporters / Fans</option>
            <option value="brand">Marcas & Alianzas</option>
            <option value="other">Otros</option>
          </select>
        </div>

        <!-- Search Input -->
        <div>
          <label class="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Buscar</label>
          <div class="relative">
            <input
              type="search"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Folio, nombre, correo, asunto…"
              class="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <svg class="absolute left-3 top-3 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Error banner -->
      @if (error()) {
        <div class="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700" role="alert">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
            </svg>
            <span>{{ error() }}</span>
          </div>
          <button type="button" (click)="error.set('')" class="text-rose-500 hover:text-rose-700 cursor-pointer">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>
      }

      <!-- Success notification banner -->
      @if (successMessage()) {
        <div class="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800" role="status">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
            </svg>
            <span>{{ successMessage() }}</span>
          </div>
          <button type="button" (click)="successMessage.set('')" class="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>
      }

      <!-- Loading State -->
      @if (loading() && tickets().length === 0) {
        <div class="flex min-h-[340px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50">
          <div class="flex flex-col items-center gap-3">
            <div class="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span class="text-sm font-semibold text-slate-600">Cargando tickets de soporte…</span>
          </div>
        </div>
      } @else if (filteredTickets().length === 0) {
        <!-- Empty State -->
        <div class="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-12 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 ring-1 ring-blue-100">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
            </svg>
          </div>
          <p class="text-base font-bold text-slate-800">No se encontraron tickets</p>
          <p class="mt-1 max-w-sm text-sm text-slate-500">
            @if (hasActiveFilters()) {
              No hay tickets que coincidan con los filtros seleccionados. Prueba a limpiarlos.
            } @else {
              No hay tickets de soporte registrados en la plataforma actualmente.
            }
          </p>
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              Restablecer filtros
            </button>
          }
        </div>
      } @else {
        <!-- Tickets Table -->
        <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm" aria-label="Catálogo de tickets de soporte">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Folio</th>
                  <th scope="col" class="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Remitente</th>
                  <th scope="col" class="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                  <th scope="col" class="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Asunto & Mensaje</th>
                  <th scope="col" class="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th scope="col" class="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Lectura</th>
                  <th scope="col" class="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th scope="col" class="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (t of filteredTickets(); track t.id) {
                  <tr
                    class="transition-colors hover:bg-slate-50/80 cursor-pointer"
                    [class.bg-amber-50/30]="!t.is_read"
                    (click)="openDetail(t)"
                  >
                    <!-- Folio -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {{ t.folio || ('#' + t.id) }}
                      </span>
                    </td>

                    <!-- Remitente -->
                    <td class="px-4 py-3.5">
                      <div class="flex items-center gap-2">
                        <div class="min-w-0">
                          <div class="font-bold text-slate-900 truncate max-w-[180px]">
                            {{ t.name || t.full_name }}
                          </div>
                          <div class="text-xs text-slate-500 truncate max-w-[180px]">
                            {{ t.email || t.mail }}
                          </div>
                          <div class="mt-0.5">
                            <span
                              class="inline-block rounded px-1.5 py-0.2 text-[10px] font-bold uppercase"
                              [ngClass]="getRoleBadgeClass(t.user_role)"
                            >
                              {{ t.user_role || 'usuario' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Categoría -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                        {{ t.category_title || t.category || 'General' }}
                      </span>
                    </td>

                    <!-- Asunto & Mensaje Preview -->
                    <td class="px-4 py-3.5">
                      <div class="max-w-xs sm:max-w-md">
                        <div
                          class="truncate font-semibold"
                          [class.font-bold]="!t.is_read"
                          [class.text-slate-950]="!t.is_read"
                          [class.text-slate-800]="t.is_read"
                        >
                          {{ t.subject }}
                        </div>
                        <div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 truncate">
                          <span class="truncate">{{ t.description || t.message }}</span>
                          @if (t.attached_file || (t.images && t.images.length > 0)) {
                            <span class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.5 9.525l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.452a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.249z" clip-rule="evenodd" />
                              </svg>
                              Adjunto
                            </span>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Estado -->
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                        [ngClass]="getStatusBadgeClass(t.status)"
                      >
                        {{ getStatusLabel(t.status) }}
                      </span>
                    </td>

                    <!-- Lectura -->
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      @if (t.is_read) {
                        <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          Leído
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          Nuevo
                        </span>
                      }
                    </td>

                    <!-- Fecha -->
                    <td class="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {{ (t.created_at || t.date) | date: 'dd/MM/yyyy HH:mm' }}
                    </td>

                    <!-- Acciones -->
                    <td class="px-4 py-3.5 text-center whitespace-nowrap" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
                        (click)="openDetail(t)"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs font-medium text-slate-500">
              Mostrando {{ filteredTickets().length }} de {{ tickets().length }} tickets cargados
              @if (total() > tickets().length) {
                · {{ total() }} en total
              }
            </p>
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              [disabled]="!hasMore() || loadingMore()"
              (click)="loadMore()"
            >
              {{ loadingMore() ? 'Cargando más…' : 'Cargar más tickets' }}
            </button>
          </div>
        </div>
      }

      <!-- Detail Slide-Over Drawer -->
      @if (selected(); as ticket) {
        <div
          class="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          (click)="closeDetail()"
        ></div>

        <aside
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl transition-all"
          role="dialog"
          aria-label="Detalle del ticket de soporte"
        >
          <!-- Drawer Header -->
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-5">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                  {{ ticket.folio || ('#' + ticket.id) }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                  [ngClass]="getStatusBadgeClass(ticket.status)"
                >
                  {{ getStatusLabel(ticket.status) }}
                </span>
                @if (!ticket.is_read) {
                  <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    Nuevo
                  </span>
                }
              </div>
              <p class="mt-1.5 text-xs text-slate-500 font-medium">
                Registrado el {{ (ticket.created_at || ticket.date) | date: 'EEEE, d de MMMM de y, HH:mm' }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="toggleReadStatus(ticket)"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                [attr.title]="ticket.is_read ? 'Marcar como no leído' : 'Marcar como leído'"
              >
                {{ ticket.is_read ? 'Marcar No Leído' : 'Marcar Leído' }}
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition cursor-pointer"
                (click)="closeDetail()"
                aria-label="Cerrar"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Drawer Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            @if (detailLoading()) {
              <div class="flex min-h-[160px] items-center justify-center">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </div>
            } @else {
              <!-- Status & Assignment Card -->
              <section class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Modificar Estado</span>
                    <p class="text-xs text-slate-500 mt-0.5">Controla el ciclo de vida del ticket en la mesa de ayuda.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <select
                      [ngModel]="ticket.status"
                      (ngModelChange)="changeTicketStatus(ticket, $event)"
                      [disabled]="statusUpdating()"
                      class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:opacity-60"
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- Sender Details -->
              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del Remitente</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-slate-500">Nombre Completo</p>
                    <p class="text-sm font-bold text-slate-900">{{ ticket.name || ticket.full_name }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-500">Correo Electrónico</p>
                    <a
                      [href]="'mailto:' + (ticket.email || ticket.mail)"
                      class="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {{ ticket.email || ticket.mail }}
                    </a>
                  </div>
                  <div>
                    <p class="text-xs text-slate-500">Rol de Usuario</p>
                    <span
                      class="inline-block mt-0.5 rounded px-2 py-0.5 text-xs font-bold uppercase"
                      [ngClass]="getRoleBadgeClass(ticket.user_role)"
                    >
                      {{ ticket.user_role || 'usuario' }}
                    </span>
                  </div>
                  @if (ticket.related_folio_or_handle) {
                    <div>
                      <p class="text-xs text-slate-500">Atleta / Folio Relacionado</p>
                      <p class="text-sm font-bold text-slate-900 font-mono">{{ ticket.related_folio_or_handle }}</p>
                    </div>
                  }
                </div>
              </section>

              <!-- Category & Subject -->
              <section class="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-blue-700">Asunto del Ticket</span>
                  <span class="rounded-lg bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    {{ ticket.category_title || ticket.category || 'General' }}
                  </span>
                </div>
                <h3 class="text-base font-bold text-slate-900">{{ ticket.subject }}</h3>
              </section>

              <!-- Description / Message -->
              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Mensaje del Usuario</span>
                <div class="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {{ ticket.description || ticket.message }}
                </div>
              </section>

              <!-- Attached Evidence / Image -->
              @if (ticket.attached_file || (ticket.images && ticket.images.length > 0)) {
                <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Archivo Adjunto / Evidencia</span>
                  <div class="flex flex-wrap gap-3">
                    @if (ticket.attached_file) {
                      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <button
                          type="button"
                          (click)="openLightbox([ticket.attached_file!], 0)"
                          class="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white cursor-pointer hover:opacity-90 transition"
                        >
                          <img
                            [src]="imageSrc(ticket.attached_file)"
                            [alt]="ticket.attached_file"
                            class="h-full w-full object-cover"
                            (error)="$any($event.target).style.display='none'"
                          />
                        </button>
                        <div>
                          <p class="text-xs font-bold text-slate-800 truncate max-w-xs">{{ ticket.attached_file }}</p>
                          <a
                            [href]="imageSrc(ticket.attached_file)"
                            target="_blank"
                            rel="noopener"
                            class="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            Abrir en nueva pestaña
                            <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h4a.75.75 0 010 1.5h-4z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 001.06 1.06l7.996-7.996V8.25a.75.75 0 001.5 0V3.75A.75.75 0 0016 3h-4.5a.75.75 0 000 1.5h2.437l-7.743 7.253z" clip-rule="evenodd"/></svg>
                          </a>
                        </div>
                      </div>
                    }
                  </div>
                </section>
              }

              <!-- Previous Reply History (If already replied) -->
              @if (ticket.reply_message) {
                <section class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <svg class="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                      </svg>
                      Respuesta Enviada por Soporte
                    </span>
                    <span class="text-xs text-emerald-700 font-medium">
                      {{ ticket.replied_at | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>
                  <div class="text-sm leading-relaxed text-slate-900 bg-white p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap">
                    {{ ticket.reply_message }}
                  </div>
                </section>
              }

              <!-- Reply Form Card -->
              <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <svg class="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                    Responder Oficialmente al Usuario por Correo
                  </span>
                </div>
                <p class="text-xs text-slate-500">
                  El mensaje redactado se enviará inmediatamente a <strong class="text-slate-700">{{ ticket.email || ticket.mail }}</strong> con el diseño oficial de Buymeashake y marcará el ticket como resuelto.
                </p>

                <!-- Quick Template Chips -->
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    (click)="fillTemplate('resolved', ticket)"
                    class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  >
                    + Solución Aplicada
                  </button>
                  <button
                    type="button"
                    (click)="fillTemplate('payout', ticket)"
                    class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  >
                    + Aclaración de Retiros/Pagos
                  </button>
                  <button
                    type="button"
                    (click)="fillTemplate('more_info', ticket)"
                    class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  >
                    + Solicitar Más Información
                  </button>
                </div>

                <!-- Textarea -->
                <div>
                  <label class="block mb-1 text-xs font-semibold text-slate-700">Mensaje de Respuesta</label>
                  <textarea
                    [(ngModel)]="replyText"
                    rows="5"
                    placeholder="Escribe la respuesta formal que recibirá el usuario..."
                    class="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  ></textarea>
                </div>

                <!-- Internal Admin Notes -->
                <div>
                  <label class="block mb-1 text-xs font-semibold text-slate-700">Notas Internas de Moderación (Opcional)</label>
                  <input
                    type="text"
                    [(ngModel)]="internalNotes"
                    placeholder="Bitácora visible únicamente para administradores..."
                    class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <!-- Send Reply Button -->
                <div class="flex justify-end">
                  <button
                    type="button"
                    [disabled]="replySubmitting() || !replyText.trim()"
                    (click)="sendReply(ticket)"
                    class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    @if (replySubmitting()) {
                      <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Enviando respuesta…</span>
                    } @else {
                      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086L2.279 16.76a.75.75 0 00.97.971l14.25-6.75a.75.75 0 000-1.362L3.105 2.289z" />
                      </svg>
                      <span>Enviar Respuesta por Correo</span>
                    }
                  </button>
                </div>
              </section>
            }
          </div>
        </aside>
      }

      <!-- Lightbox Modal -->
      @if (lightbox(); as lb) {
        <div
          class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          (click)="closeLightbox()"
        >
          <button
            type="button"
            class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
            (click)="closeLightbox()"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>

          <div class="flex max-h-[90vh] max-w-[95vw] flex-col items-center gap-3" (click)="$event.stopPropagation()">
            <img
              [src]="imageSrc(lb.urls[lb.index])"
              alt="Evidencia adjunta"
              class="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      }

    </div>
  `,
})
export class ContactPanelComponent implements OnInit {
  private contactApi = inject(ContactApiService);

  readonly readFilterOptions = CONTACT_READ_FILTER_OPTIONS;
  readonly statusFilterOptions = CONTACT_STATUS_FILTER_OPTIONS;

  tickets = signal<ContactTicket[]>([]);
  selected = signal<ContactTicket | null>(null);
  lightbox = signal<{ urls: string[]; index: number } | null>(null);

  loading = signal(false);
  loadingMore = signal(false);
  detailLoading = signal(false);
  statusUpdating = signal(false);
  replySubmitting = signal(false);

  error = signal('');
  successMessage = signal('');
  total = signal(0);
  readCount = signal(0);
  hasMore = signal(false);
  pageSize = 50;

  readFilter = signal<ContactReadFilter>('');
  statusFilter = signal<ContactStatusFilter>('');
  roleFilter = signal<string>('');
  searchQuery = signal<string>('');

  replyText = '';
  internalNotes = '';

  unreadCount = computed(() => Math.max(0, this.total() - this.readCount()));

  hasActiveFilters = computed(() => {
    return (
      Boolean(this.readFilter()) ||
      Boolean(this.statusFilter()) ||
      Boolean(this.roleFilter()) ||
      Boolean(this.searchQuery().trim())
    );
  });

  filteredTickets = computed(() => {
    let list = this.tickets();
    const rf = this.readFilter();
    if (rf === 'unread') {
      list = list.filter((t) => !t.is_read);
    } else if (rf === 'read') {
      list = list.filter((t) => t.is_read);
    }

    const sf = this.statusFilter();
    if (sf) {
      list = list.filter((t) => t.status === sf);
    }

    const role = this.roleFilter();
    if (role) {
      list = list.filter((t) => (t.user_role || '').toLowerCase() === role.toLowerCase());
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.folio && t.folio.toLowerCase().includes(q)) ||
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.full_name && t.full_name.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          (t.mail && t.mail.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.related_folio_or_handle && t.related_folio_or_handle.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.reload();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.lightbox()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeLightbox();
      }
      return;
    }
    if (event.key === 'Escape' && this.selected()) {
      event.preventDefault();
      this.closeDetail();
    }
  }

  onReadFilterChange(val: ContactReadFilter): void {
    this.readFilter.set(val);
  }

  onStatusFilterChange(val: ContactStatusFilter): void {
    this.statusFilter.set(val);
  }

  onRoleFilterChange(val: string): void {
    this.roleFilter.set(val);
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  resetFilters(): void {
    this.readFilter.set('');
    this.statusFilter.set('');
    this.roleFilter.set('');
    this.searchQuery.set('');
  }

  reload(): void {
    this.error.set('');
    this.loading.set(true);
    this.contactApi.getList({ last_id: 0, limit: this.pageSize }).subscribe({
      next: (res) => {
        const rows = res.result ?? [];
        this.tickets.set(rows);
        this.applyTotalsFrom(rows, res);
        this.hasMore.set(rows.length >= this.pageSize);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los tickets de soporte.'));
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    const current = this.tickets();
    if (current.length === 0) return;
    const lastId = current[current.length - 1]?.id;
    if (!lastId) return;

    this.loadingMore.set(true);
    this.contactApi.getList({ last_id: lastId, limit: this.pageSize }).subscribe({
      next: (res) => {
        const rows = res.result ?? [];
        const merged = [...current, ...rows];
        this.tickets.set(merged);
        this.applyTotalsFrom(rows.length ? rows : current, res);
        this.hasMore.set(rows.length >= this.pageSize);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar más tickets.'));
        this.loadingMore.set(false);
      },
    });
  }

  openDetail(ticket: ContactTicket): void {
    this.selected.set(ticket);
    this.replyText = '';
    this.internalNotes = ticket.admin_notes || '';
    this.detailLoading.set(true);

    this.contactApi.getById(ticket.id).subscribe({
      next: (res) => {
        const updated = res.result?.[0] ?? { ...ticket, is_read: true, read: true };
        this.selected.set(updated);
        this.internalNotes = updated.admin_notes || '';
        this.tickets.update((list) =>
          list.map((t) => (t.id === updated.id ? { ...t, ...updated, is_read: true, read: true } : t)),
        );
        if (!ticket.is_read) {
          this.readCount.update((n) => Math.min(this.total(), n + 1));
        }
        this.detailLoading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo abrir el detalle del ticket.'));
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.selected.set(null);
    this.lightbox.set(null);
    this.replyText = '';
    this.internalNotes = '';
  }

  toggleReadStatus(ticket: ContactTicket): void {
    const nextRead = !ticket.is_read;
    this.contactApi.toggleRead(ticket.id, nextRead).subscribe({
      next: () => {
        this.tickets.update((list) =>
          list.map((t) => (t.id === ticket.id ? { ...t, is_read: nextRead, read: nextRead } : t)),
        );
        if (this.selected()?.id === ticket.id) {
          this.selected.update((s) => s ? { ...s, is_read: nextRead, read: nextRead } : null);
        }
        this.readCount.update((n) => (nextRead ? Math.min(this.total(), n + 1) : Math.max(0, n - 1)));
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Error al cambiar estado de lectura.'));
      },
    });
  }

  changeTicketStatus(ticket: ContactTicket, newStatus: string): void {
    if (!newStatus || newStatus === ticket.status) return;
    this.statusUpdating.set(true);
    this.contactApi.updateStatus(ticket.id, { status: newStatus }).subscribe({
      next: () => {
        this.tickets.update((list) =>
          list.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t)),
        );
        if (this.selected()?.id === ticket.id) {
          this.selected.update((s) => s ? { ...s, status: newStatus } : null);
        }
        this.statusUpdating.set(false);
        this.successMessage.set(`Estado del ticket actualizado a "${this.getStatusLabel(newStatus)}".`);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.statusUpdating.set(false);
        this.error.set(extractApiErrorMessage(err, 'No se pudo actualizar el estado del ticket.'));
      },
    });
  }

  fillTemplate(type: 'resolved' | 'payout' | 'more_info', ticket: ContactTicket): void {
    const name = ticket.name || ticket.full_name || 'Atleta';
    if (type === 'resolved') {
      this.replyText = `Hola ${name},\n\nHemos verificado y procesado la solución referente a tu solicitud con folio ${ticket.folio}. La incidencia ha sido subsanada en nuestros sistemas.\n\nQuedamos a tu disposición ante cualquier duda adicional.`;
    } else if (type === 'payout') {
      this.replyText = `Hola ${name},\n\nRespecto a tu consulta sobre pagos y retiros, te informamos que las transferencias a cuenta CLABE/Stripe Connect se liquidan en días hábiles dentro del plazo estipulado. Hemos verificado el estado de tu cuenta y se encuentra en orden.\n\n¡Gracias por formar parte de BuyMeAShake!`;
    } else if (type === 'more_info') {
      this.replyText = `Hola ${name},\n\nPara poder dar seguimiento preciso a tu caso, requerimos amablemente que nos proporciones mayor información o capturas adicionales respecto al comportamiento observado.\n\nPuedes responder directamente a este mensaje.`;
    }
  }

  sendReply(ticket: ContactTicket): void {
    const cleanMsg = this.replyText.trim();
    if (!cleanMsg) return;

    this.replySubmitting.set(true);
    this.error.set('');

    this.contactApi.reply(ticket.id, {
      reply_message: cleanMsg,
      admin_notes: this.internalNotes.trim() || undefined,
    }).subscribe({
      next: (res) => {
        const updatedTicket: ContactTicket = res.result?.[0] ?? {
          ...ticket,
          status: 'resolved',
          is_read: true,
          read: true,
          reply_message: cleanMsg,
          replied_at: new Date().toISOString(),
        };

        this.tickets.update((list) =>
          list.map((t) => (t.id === ticket.id ? { ...t, ...updatedTicket } : t)),
        );
        this.selected.set(updatedTicket);
        this.replySubmitting.set(false);
        this.replyText = '';
        this.successMessage.set(
          `Respuesta enviada con éxito a ${ticket.email || ticket.mail}. El ticket ha quedado marcado como resuelto.`,
        );
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (err) => {
        this.replySubmitting.set(false);
        this.error.set(extractApiErrorMessage(err, 'No se pudo enviar la respuesta de soporte.'));
      },
    });
  }

  openLightbox(urls: string[], index: number): void {
    this.lightbox.set({ urls: [...urls], index });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  imageSrc(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
    const origin = API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'open':
        return 'Abierto';
      case 'in_progress':
        return 'En Progreso';
      case 'resolved':
        return 'Resuelto';
      case 'closed':
        return 'Cerrado';
      default:
        return status || 'Abierto';
    }
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'open':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'resolved':
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-300';
      case 'closed':
        return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  getRoleBadgeClass(role: string | undefined): string {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'athlete':
        return 'bg-amber-100 text-amber-800';
      case 'supporter':
        return 'bg-indigo-100 text-indigo-800';
      case 'brand':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  private applyTotalsFrom(rows: ContactTicket[], res?: any): void {
    if (res?.total != null) {
      this.total.set(res.total);
    } else {
      const sample = rows[0];
      if (sample?.total != null) this.total.set(sample.total);
    }

    if (res?.read_count != null) {
      this.readCount.set(res.read_count);
    } else {
      const sample = rows[0];
      if (sample?.read_count != null) this.readCount.set(sample.read_count);
    }
  }
}

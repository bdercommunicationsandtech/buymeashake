import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersApiService } from '../../core/services/users-api.service';
import {
  AdminRoleItem,
  AdminUser,
  AdminUserStatusPayload,
  AdminUserUpdatePayload,
  AccountEnforcementStatus,
  EmailBlacklistItem,
  DEFAULT_ROLE_NAME,
  ROLE_OPTIONS,
  roleLabel,
} from '../../core/models/user.model';

type UsersTab = 'users' | 'blacklist';

@Component({
  selector: 'app-users-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, UpperCasePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">

      <!-- Header -->
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Usuarios</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">Gestión de cuentas y lista negra de correos</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          @if (activeTab() === 'users' && total() > 0) {
            <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {{ total() }} registros
            </span>
          }
          @if (activeTab() === 'blacklist' && blacklistTotal() > 0) {
            <span class="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              {{ blacklistTotal() }} en lista negra
            </span>
          }
          @if (activeTab() === 'blacklist') {
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:opacity-60"
              [disabled]="blacklistSaving()"
              (click)="openBlacklistCreate()"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
              Agregar correo
            </button>
          }
        </div>
      </header>

      <nav class="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white/70 p-1 shadow-sm backdrop-blur-md w-fit" aria-label="Secciones de usuarios">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer"
          [class.bg-indigo-600]="activeTab() === 'users'"
          [class.text-white]="activeTab() === 'users'"
          [class.text-slate-600]="activeTab() !== 'users'"
          [class.hover:bg-slate-50]="activeTab() !== 'users'"
          (click)="setTab('users')"
        >
          Usuarios
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer"
          [class.bg-indigo-600]="activeTab() === 'blacklist'"
          [class.text-white]="activeTab() === 'blacklist'"
          [class.text-slate-600]="activeTab() !== 'blacklist'"
          [class.hover:bg-slate-50]="activeTab() !== 'blacklist'"
          (click)="setTab('blacklist')"
        >
          Lista negra
        </button>
      </nav>

      @if (success()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          {{ success() }}
        </div>
      }

      @if (activeTab() === 'users') {
      <!-- Filters bar -->
      <div class="mb-6 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="user-search"
            type="text"
            placeholder="Buscar por email, nombre, usuario..."
            class="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-4 text-sm text-slate-800 shadow-sm backdrop-blur-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            aria-label="Buscar usuario"
          />
        </div>
        <select
          [(ngModel)]="selectedRole"
          (ngModelChange)="onSearch()"
          class="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Filtrar por rol"
        >
          <option [ngValue]="'all'">Todos los roles</option>
          <option [ngValue]="'admin'">Admin</option>
          <option [ngValue]="'user'">Usuario normal</option>
          <option [ngValue]="'marketing'">Marketing</option>
        </select>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          (click)="onSearch()"
        >
          Buscar
        </button>
      </div>
      } @else {
      <div class="mb-6 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="blacklist-search"
            type="text"
            placeholder="Buscar por correo o motivo..."
            class="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-4 text-sm text-slate-800 shadow-sm backdrop-blur-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
            [(ngModel)]="blacklistSearchQuery"
            (keyup.enter)="onBlacklistSearch()"
            aria-label="Buscar en lista negra"
          />
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          (click)="onBlacklistSearch()"
        >
          Buscar
        </button>
      </div>
      }

      @if (activeTab() === 'users') {
      @if (error()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ error() }}
        </div>
      }

      @if (loading()) {
        <div class="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando usuarios...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Lista de usuarios">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-12"></th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Usuario / Email</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Registro</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                    <td class="px-4 py-3 text-xs font-mono text-slate-400">#{{ u.id }}</td>
                    <td class="px-4 py-3">
                      <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
                        <span>{{ (u.first_name?.[0] || u.email?.[0] || '?') | uppercase }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800">{{ u.username }}</div>
                      <div class="text-slate-500 text-xs mt-0.5">{{ u.email }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 font-medium">{{ u.first_name }} {{ u.last_name }}</td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex flex-col items-center justify-center gap-1.5">
                        @if (u.deleted) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                            <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>Eliminado
                          </span>
                        } @else {
                          <span [class]="enforcementPillClass(u)">
                            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>{{ enforcementLabel(u) }}
                          </span>
                        }
                        @if (u.legal_hold) {
                          <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            <svg class="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            LEGAL HOLD
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500">
                      {{ u.registration_date ? (u.registration_date | date : 'd MMM y, h:mm a') : '—' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="inline-flex items-center gap-1">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                          title="Ver detalle"
                          (click)="openDetail(u)"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-4 py-16 text-center text-sm italic text-slate-400">
                      No se encontraron usuarios
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid-pagination mt-4">
          <div class="pagination-left">
            <label class="pagination-label">Registros por página</label>
            <select class="pagination-select" [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
              @for (opt of pageSizeOptions; track opt) {
                <option [ngValue]="opt">{{ opt }}</option>
              }
            </select>
          </div>
          <div class="pagination-center">
            <span class="pagination-info">
              Mostrando {{ fromRecord() }}-{{ toRecord() }} de {{ total() }} registros
            </span>
          </div>
          <div class="pagination-right">
            <button type="button" class="btn-page" [disabled]="page() <= 1" (click)="prevPage()">Anterior</button>
            <span class="pagination-page">Página {{ page() }} de {{ totalPages() }}</span>
            <button type="button" class="btn-page" [disabled]="page() >= totalPages()" (click)="nextPage()">Siguiente</button>
          </div>
        </div>
      }
      }

      @if (activeTab() === 'blacklist') {
      @if (blacklistError()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {{ blacklistError() }}
        </div>
      }

      @if (blacklistLoading()) {
        <div class="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando lista negra...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Lista negra de correos">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Correo</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Usuario</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (row of blacklist(); track row.id) {
                  <tr class="border-b border-slate-50 transition-colors hover:bg-rose-50/40">
                    <td class="px-4 py-3 text-xs font-mono text-slate-400">#{{ row.id }}</td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800">{{ row.email }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 text-sm max-w-xs">
                      {{ row.reason || '—' }}
                    </td>
                    <td class="px-4 py-3 text-xs font-mono text-slate-500">
                      {{ row.user_id ? '#' + row.user_id : '—' }}
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500">
                      {{ row.created_at ? (row.created_at | date : 'd MMM y, h:mm a') : '—' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer disabled:opacity-40"
                          title="Editar motivo"
                          [disabled]="blacklistSaving()"
                          (click)="openBlacklistEdit(row)"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 cursor-pointer disabled:opacity-40"
                          title="Quitar de lista negra"
                          [disabled]="blacklistSaving()"
                          (click)="askBlacklistDelete(row)"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 112 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-4 py-16 text-center text-sm italic text-slate-400">
                      No hay correos en la lista negra
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid-pagination mt-4">
          <div class="pagination-left">
            <label class="pagination-label">Registros por página</label>
            <select class="pagination-select" [ngModel]="blacklistLimit()" (ngModelChange)="onBlacklistLimitChange($event)">
              @for (opt of pageSizeOptions; track opt) {
                <option [ngValue]="opt">{{ opt }}</option>
              }
            </select>
          </div>
          <div class="pagination-center">
            <span class="pagination-info">
              Mostrando {{ blacklistFromRecord() }}-{{ blacklistToRecord() }} de {{ blacklistTotal() }} registros
            </span>
          </div>
          <div class="pagination-right">
            <button type="button" class="btn-page" [disabled]="blacklistPage() <= 1" (click)="blacklistPrevPage()">Anterior</button>
            <span class="pagination-page">Página {{ blacklistPage() }} de {{ blacklistTotalPages() }}</span>
            <button type="button" class="btn-page" [disabled]="blacklistPage() >= blacklistTotalPages()" (click)="blacklistNextPage()">Siguiente</button>
          </div>
        </div>
      }
      }

      <!-- Detail slide-over -->
      @if (selectedUser(); as u) {
        <div class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" (click)="isEditing() ? cancelEdit() : closeDetail()"></div>

        <aside
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden rounded-l-2xl border-l border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-in"
          role="dialog"
          aria-label="Detalle del usuario"
        >
          <div class="flex items-center justify-between border-b border-slate-100/80 bg-white/60 px-5 py-4 backdrop-blur-md">
            <div>
              <h2 class="text-base font-bold text-slate-900">
                {{ isEditing() ? 'Editar Usuario' : 'Detalle del Usuario' }}
              </h2>
              <p class="text-xs text-slate-500 font-medium mt-0.5">{{ u.first_name }} {{ u.last_name }}</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              (click)="isEditing() ? cancelEdit() : closeDetail()"
              aria-label="Cerrar"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 p-5 text-white shadow-lg">
              <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
              <div class="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5"></div>
              <div class="relative flex items-center gap-4">
                <div class="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-lg font-extrabold shadow-inner backdrop-blur-sm">
                  <span>{{ (u.first_name?.[0] || u.email?.[0] || '?') | uppercase }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="truncate text-lg font-extrabold">{{ u.first_name }} {{ u.last_name }}</h3>
                  <p class="truncate text-sm text-white/75">{{ u.email }}</p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  @if (u.deleted) {
                    <span class="shrink-0 rounded-full bg-red-400/30 px-2.5 py-1 text-xs font-bold text-red-100 ring-1 ring-red-300/50">
                      Eliminado
                    </span>
                  } @else {
                    <span [class]="enforcementHeroBadgeClass(u)">
                      {{ enforcementLabel(u) }}
                    </span>
                  }
                  @if (u.legal_hold) {
                    <span class="shrink-0 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-300/50 flex items-center gap-1">
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      LEGAL HOLD
                    </span>
                  }
                </div>
              </div>
            </div>

            @if (detailError()) {
              <div class="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3.5" role="alert">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.5h.008M10.34 3.94l-7.1 12.3A1.5 1.5 0 004.54 18.5h14.92a1.5 1.5 0 001.3-2.26l-7.1-12.3a1.5 1.5 0 00-2.6 0z" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-rose-800">{{ detailError() }}</p>
                  <p class="mt-0.5 text-xs font-medium text-rose-600">Revisa la información e inténtalo de nuevo.</p>
                </div>
              </div>
            }
            @if (detailSuccess()) {
              <div class="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5" role="status">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-emerald-800">{{ detailSuccess() }}</p>
                  <p class="mt-0.5 text-xs font-medium text-emerald-600">{{ enforcementHint(u) }}</p>
                </div>
              </div>
            }

            @if (!isEditing()) {
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
                  <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 1115 0v.25H4.5v-.25z" />
                    </svg>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Información de cuenta</p>
                  </div>
                  <dl class="divide-y divide-slate-50 px-4 py-1">
                    <div class="flex items-center justify-between gap-3 py-2.5">
                      <dt class="text-xs font-medium text-slate-500">ID Usuario</dt>
                      <dd class="font-mono text-xs font-semibold text-slate-700">#{{ u.id }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3 py-2.5">
                      <dt class="text-xs font-medium text-slate-500">Username</dt>
                      <dd class="truncate text-xs font-semibold text-slate-700">{{ u.username }}</dd>
                    </div>
                    @if (u.phone_number) {
                      <div class="flex items-center justify-between gap-3 py-2.5">
                        <dt class="text-xs font-medium text-slate-500">Teléfono</dt>
                        <dd class="text-xs font-semibold text-slate-700">{{ u.phone_number }}</dd>
                      </div>
                    }
                    <div class="flex items-center justify-between gap-3 py-2.5">
                      <dt class="text-xs font-medium text-slate-500">Género</dt>
                      <dd class="text-xs font-semibold text-slate-700">{{ u.gender || '—' }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
                  <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7.5 2.5v5.75c0 4.4-3.05 7.6-7.5 9-4.45-1.4-7.5-4.6-7.5-9V5.5L12 3z" />
                    </svg>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Roles asignados</p>
                  </div>
                  <div class="space-y-3 px-4 py-3">
                    <div class="flex flex-wrap gap-2">
                      @for (role of userRoles(u); track role) {
                        <span class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {{ roleDisplay(role) }}
                          @if (!u.deleted && canRemoveRole(role)) {
                            <button
                              type="button"
                              class="rounded p-0.5 text-blue-500 transition hover:bg-blue-100 hover:text-rose-600 cursor-pointer disabled:opacity-40"
                              [disabled]="rolesBusy()"
                              (click)="removeRole(u, role)"
                              [attr.aria-label]="'Quitar rol ' + roleDisplay(role)"
                              title="Quitar rol"
                            >
                              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          }
                        </span>
                      } @empty {
                        <span class="text-xs font-medium text-slate-400">Sin roles activos</span>
                      }
                    </div>

                    @if (!u.deleted) {
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          [(ngModel)]="roleToAdd"
                          [ngModelOptions]="{ standalone: true }"
                          class="w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Seleccionar rol…</option>
                          @for (role of availableRolesToAdd(u); track role.name) {
                            <option [ngValue]="role.name">{{ roleDisplay(role.name) }}@if (role.description) { — {{ role.description }} }</option>
                          }
                        </select>
                        <button
                          type="button"
                          class="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          [disabled]="!roleToAdd || rolesBusy()"
                          (click)="assignRole(u)"
                        >
                          @if (rolesBusy()) {
                            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                          }
                          Añadir rol
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
                <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7.5 2.5v5.75c0 4.4-3.05 7.6-7.5 9-4.45-1.4-7.5-4.6-7.5-9V5.5L12 3z" />
                  </svg>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enforcement status</p>
                </div>
                <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <span [class]="enforcementIconClass(u)">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="enforcementIconPath(u)" />
                      </svg>
                    </span>
                    <div class="min-w-0">
                      <p [class]="'text-sm font-bold ' + enforcementToneClass(u)">{{ enforcementLabel(u) }}</p>
                      <p class="mt-0.5 text-xs font-medium text-slate-500">{{ enforcementHint(u) }}</p>
                    </div>
                  </div>
                  <div class="flex gap-2 sm:border-l sm:border-slate-100 sm:pl-4">
                    <div class="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center sm:min-w-[108px]">
                      <p class="text-lg font-extrabold leading-none text-slate-800">
                        {{ u.enforcement?.active_strikes_count || 0 }}
                      </p>
                      <p class="mt-1.5 text-[11px] font-semibold text-slate-500">Strikes activos</p>
                    </div>
                    <div class="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center sm:min-w-[108px]">
                      <p class="text-lg font-extrabold leading-none text-slate-800">
                        {{ u.enforcement?.total_strikes_points || 0 }} pts
                      </p>
                      <p class="mt-1.5 text-[11px] font-semibold text-slate-500">Puntos acumulados</p>
                    </div>
                  </div>
                </div>
                @if (u.enforcement?.suspended_until || u.enforcement?.ban_reason) {
                  <dl class="divide-y divide-slate-50 border-t border-slate-100 px-4 py-1">
                    @if (u.enforcement?.suspended_until) {
                      <div class="flex items-center justify-between gap-3 py-2.5">
                        <dt class="text-xs font-medium text-slate-500">Vigente hasta</dt>
                        <dd class="text-xs font-semibold text-slate-700">
                          {{ u.enforcement?.suspended_until | date : 'd MMM y, h:mm a' }}
                        </dd>
                      </div>
                    }
                    @if (u.enforcement?.ban_reason) {
                      <div class="flex items-start justify-between gap-3 py-2.5">
                        <dt class="shrink-0 text-xs font-medium text-slate-500">Motivo</dt>
                        <dd class="text-right text-xs font-semibold text-slate-700">{{ u.enforcement?.ban_reason }}</dd>
                      </div>
                    }
                  </dl>
                }
              </div>

              @if (!u.deleted) {
                <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
                  <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div class="flex items-center gap-2">
                      <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 0l6.5 6.5M12 6L5.5 12.5M3 15h7m4 0h7m-16 5h18" />
                      </svg>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Acciones administrativas</p>
                    </div>
                    <p class="mt-1 text-xs font-medium text-slate-500">
                      Selecciona una acción para aplicar una medida de enforcement a este usuario.
                    </p>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <button
                      type="button"
                      class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-amber-50/60"
                      (click)="toggleLegalHold(u)"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-bold text-slate-800">
                          {{ u.legal_hold ? 'Quitar Retención Legal' : 'Activar Retención Legal' }}
                        </span>
                        <span class="block text-xs font-medium text-slate-500">
                          {{ u.legal_hold ? 'Permite que la información personal pueda ser eliminada.' : 'Evita la eliminación de información personal durante procesos de revisión.' }}
                        </span>
                      </span>
                      <div class="shrink-0 flex items-center justify-center rounded-full w-10 h-6 p-1 transition-colors duration-200"
                           [class.bg-indigo-600]="u.legal_hold"
                           [class.bg-slate-200]="!u.legal_hold">
                        <div class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 transform"
                             [class.translate-x-4]="u.legal_hold"
                             [class.translate-x-0]="!u.legal_hold"></div>
                      </div>
                    </button>
                    @if (enforcementStatus(u) !== 'ACTIVE') {
                      <button
                        type="button"
                        class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/60"
                        (click)="openSanction('ACTIVE', null)"
                      >
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block text-sm font-bold text-slate-800">Reactivar cuenta</span>
                          <span class="block text-xs font-medium text-slate-500">Devuelve el acceso completo a la plataforma</span>
                        </span>
                        <svg class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    }
                    @if (enforcementStatus(u) !== 'BANNED') {
                      @if (enforcementStatus(u) !== 'SUSPENDED') {
                        <button
                          type="button"
                          class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-amber-50/60"
                          (click)="openSanction('SUSPENDED', 30)"
                        >
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.5h.008M10.34 3.94l-7.1 12.3A1.5 1.5 0 004.54 18.5h14.92a1.5 1.5 0 001.3-2.26l-7.1-12.3a1.5 1.5 0 00-2.6 0z" />
                            </svg>
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block text-sm font-bold text-slate-800">Suspender 30 días</span>
                            <span class="block text-xs font-medium text-slate-500">Restringe el acceso del usuario por 30 días</span>
                          </span>
                          <svg class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-violet-50/60"
                          (click)="openSanction('RESTRICTED', 30)"
                        >
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-1.5 0h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 016 10.5z" />
                            </svg>
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block text-sm font-bold text-slate-800">Restringir 30 días</span>
                            <span class="block text-xs font-medium text-slate-500">Aplica restricciones parciales por 30 días</span>
                          </span>
                          <svg class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-violet-50/60"
                          (click)="openSanction('RESTRICTED', null)"
                        >
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block text-sm font-bold text-slate-800">Restringir indefinido</span>
                            <span class="block text-xs font-medium text-slate-500">Aplica restricciones indefinidas hasta nuevo aviso</span>
                          </span>
                          <svg class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      }
                      <button
                        type="button"
                        class="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-rose-50/60"
                        (click)="openSanction('BANNED', null)"
                      >
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block text-sm font-bold text-slate-800">Ban indefinido</span>
                          <span class="block text-xs font-medium text-slate-500">Prohíbe el acceso permanente a la plataforma</span>
                        </span>
                        <svg class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }

              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
                <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75V12l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Historial</p>
                </div>
                <dl class="divide-y divide-slate-50 px-4 py-1">
                  <div class="flex items-center justify-between gap-3 py-2.5">
                    <dt class="text-xs font-medium text-slate-500">Registrado</dt>
                    <dd class="text-xs font-semibold text-slate-700">
                      {{ u.registration_date ? (u.registration_date | date : 'd MMM y') : '—' }}
                    </dd>
                  </div>
                  @if (u.enforcement?.last_sanction_at) {
                    <div class="flex items-center justify-between gap-3 py-2.5">
                      <dt class="text-xs font-medium text-slate-500">Última sanción</dt>
                      <dd class="text-xs font-semibold text-slate-700">
                        {{ u.enforcement?.last_sanction_at | date : 'd MMM y, h:mm a' }}
                      </dd>
                    </div>
                  }
                </dl>
              </div>
            } @else {
              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md p-5">
                <div class="space-y-4">
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                    <input
                      type="text"
                      [ngModel]="editForm.username"
                      [ngModelOptions]="{ standalone: true }"
                      disabled
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Rol</label>
                    <select
                      [(ngModel)]="editForm.role_id"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition bg-white/85 text-slate-800"
                    >
                      @for (role of roleOptions; track role.id) {
                        <option [ngValue]="role.id">{{ role.label }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nueva contraseña (opcional)</label>
                    <input
                      type="password"
                      [(ngModel)]="editForm.password"
                      placeholder="Dejar vacío para no cambiar"
                      class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition bg-white/85 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="flex items-center justify-end gap-2.5 border-t border-slate-100/80 bg-slate-50/60 px-5 py-4 backdrop-blur-md">
            @if (!u.deleted && !isEditing()) {
              <button
                type="button"
                (click)="askDelete(u)"
                class="mr-auto flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            }

            @if (!isEditing()) {
              @if (!u.deleted) {
                <button
                  type="button"
                  (click)="startEdit()"
                  class="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Editar
                </button>
              }
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                (click)="closeDetail()"
              >
                Cerrar
              </button>
            } @else {
              <button
                type="button"
                (click)="cancelEdit()"
                [disabled]="saving()"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="saveEdit()"
                [disabled]="saving()"
                class="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                @if (saving()) {
                  <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                  Guardando...
                } @else {
                  Guardar Cambios
                }
              </button>
            }
          </div>
        </aside>
      }

      @if (deleteTarget(); as target) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div class="p-6 text-center">
              <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900">Eliminar usuario</h3>
              <p class="mt-2 text-sm text-slate-500">
                Se anonimizará la cuenta de <strong>{{ target.first_name }} {{ target.last_name }}</strong>
                y se bloqueará el acceso.
              </p>
              @if (deleteError()) {
                <div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {{ deleteError() }}
                </div>
              }
            </div>
            <div class="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                (click)="closeDelete()"
                [disabled]="deleting()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                (click)="confirmDelete()"
                [disabled]="deleting()"
              >
                {{ deleting() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (sanctionOpen()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div class="p-6 space-y-4">
              <h3 class="text-base font-bold text-slate-900">{{ sanctionTitle() }}</h3>
              <p class="text-sm text-slate-500">{{ sanctionDescription() }}</p>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</label>
                  <span class="text-[11px] font-semibold"
                    [class.text-rose-500]="(sanctionReason.trim().length < 3) || sanctionReason.trim().length > 500"
                    [class.text-emerald-600]="sanctionReason.trim().length >= 3 && sanctionReason.trim().length <= 500">
                    {{ sanctionReason.trim().length }}/500
                  </span>
                </div>
                <textarea
                  rows="3"
                  maxlength="500"
                  [(ngModel)]="sanctionReason"
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Describe la infracción..."
                ></textarea>
              </div>
              @if (sanctionStatus() === 'SUSPENDED' || (sanctionStatus() === 'RESTRICTED' && sanctionDays() !== null)) {
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Días</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    [(ngModel)]="sanctionDaysModel"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              }
              @if (sanctionError()) {
                <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {{ sanctionError() }}
                </div>
              }
            </div>
            <div class="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                (click)="closeSanction()"
                [disabled]="sanctionSaving()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                (click)="confirmSanction()"
                [disabled]="sanctionSaving()"
              >
                {{ sanctionSaving() ? 'Aplicando...' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (blacklistModalOpen()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <form (ngSubmit)="saveBlacklist()" class="p-6 space-y-4">
              <h3 class="text-base font-bold text-slate-900">
                {{ blacklistEditing() ? 'Editar motivo' : 'Agregar a lista negra' }}
              </h3>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Correo</label>
                <input
                  type="email"
                  required
                  [disabled]="blacklistEditing()"
                  [(ngModel)]="blacklistForm.email"
                  name="blacklistEmail"
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</label>
                  <span class="text-[11px] font-semibold"
                    [class.text-rose-500]="(blacklistForm.reason.trim().length < 3) || blacklistForm.reason.trim().length > 255"
                    [class.text-emerald-600]="blacklistForm.reason.trim().length >= 3 && blacklistForm.reason.trim().length <= 255">
                    {{ blacklistForm.reason.trim().length }}/255
                  </span>
                </div>
                <textarea
                  rows="3"
                  maxlength="255"
                  [(ngModel)]="blacklistForm.reason"
                  name="blacklistReason"
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Motivo del bloqueo..."
                ></textarea>
              </div>
              @if (blacklistModalError()) {
                <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {{ blacklistModalError() }}
                </div>
              }
              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  (click)="closeBlacklistModal()"
                  [disabled]="blacklistSaving()"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                  [disabled]="blacklistSaving()"
                >
                  {{ blacklistSaving() ? 'Guardando...' : (blacklistEditing() ? 'Guardar' : 'Agregar') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (blacklistDeleteTarget(); as bl) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div class="p-6 space-y-4">
              <h3 class="text-base font-bold text-slate-900">Quitar de lista negra</h3>
              <p class="text-sm text-slate-500">
                ¿Eliminar <strong class="text-slate-800">{{ bl.email }}</strong> de la lista negra?
                El correo podrá volver a registrarse o iniciar sesión si no hay otra sanción.
              </p>
              @if (blacklistDeleteError()) {
                <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {{ blacklistDeleteError() }}
                </div>
              }
              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  (click)="closeBlacklistDelete()"
                  [disabled]="blacklistSaving()"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
                  (click)="confirmBlacklistDelete()"
                  [disabled]="blacklistSaving()"
                >
                  {{ blacklistSaving() ? 'Eliminando...' : 'Quitar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class UsersPanelComponent implements OnInit {
  activeTab = signal<UsersTab>('users');
  success = signal<string | null>(null);

  users = signal<AdminUser[]>([]);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);
  detailError = signal<string | null>(null);
  detailSuccess = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  selectedUser = signal<AdminUser | null>(null);
  deleteTarget = signal<AdminUser | null>(null);
  isEditing = signal(false);

  sanctionOpen = signal(false);
  sanctionSaving = signal(false);
  sanctionError = signal<string | null>(null);
  sanctionStatus = signal<AccountEnforcementStatus>('SUSPENDED');
  sanctionDays = signal<number | null>(30);
  sanctionReason = '';
  sanctionDaysModel = 30;

  searchQuery = '';
  selectedRole: 'all' | 'admin' | 'user' | 'marketing' = 'all';
  page = signal(1);
  limit = signal(10);
  total = signal(0);
  pageSizeOptions = [5, 10, 50, 100];

  blacklist = signal<EmailBlacklistItem[]>([]);
  blacklistLoading = signal(false);
  blacklistSaving = signal(false);
  blacklistError = signal<string | null>(null);
  blacklistSearchQuery = '';
  blacklistPage = signal(1);
  blacklistLimit = signal(10);
  blacklistTotal = signal(0);
  blacklistModalOpen = signal(false);
  blacklistEditing = signal(false);
  blacklistModalError = signal<string | null>(null);
  blacklistDeleteTarget = signal<EmailBlacklistItem | null>(null);
  blacklistDeleteError = signal<string | null>(null);
  blacklistForm = { email: '', reason: '' };
  blacklistEditId: number | null = null;

  roleOptions = ROLE_OPTIONS;
  editForm: AdminUserUpdatePayload & { password?: string } = {};
  rolesCatalogue = signal<AdminRoleItem[]>([]);
  rolesBusy = signal(false);
  roleToAdd = '';

  fromRecord = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  toRecord = computed(() => Math.min(this.page() * this.limit(), this.total()));

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  blacklistFromRecord = computed(() => {
    if (this.blacklistTotal() === 0) return 0;
    return (this.blacklistPage() - 1) * this.blacklistLimit() + 1;
  });

  blacklistToRecord = computed(() =>
    Math.min(this.blacklistPage() * this.blacklistLimit(), this.blacklistTotal()),
  );

  blacklistTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.blacklistTotal() / this.blacklistLimit())),
  );

  constructor(private usersApi: UsersApiService) {}

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private openingQueryId: number | null = null;

  ngOnInit(): void {
    this.loadData();
    this.loadRolesCatalogue();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id < 1) return;
      this.openUserFromQuery(id);
    });
  }

  private loadRolesCatalogue(): void {
    this.usersApi.getRolesCatalogue().subscribe({
      next: (res) => {
        const allowed = new Set(['admin', 'user', 'marketing']);
        this.rolesCatalogue.set(
          (res.result ?? []).filter((r) => allowed.has(String(r.name).toLowerCase())),
        );
      },
      error: () => this.rolesCatalogue.set([]),
    });
  }

  roleDisplay(name: string): string {
    return roleLabel(name);
  }

  canRemoveRole(roleName: string): boolean {
    return String(roleName).trim().toLowerCase() !== DEFAULT_ROLE_NAME;
  }

  userRoles(user: AdminUser): string[] {
    const roles = (user.roles ?? [])
      .map((r) => String(r).trim().toLowerCase())
      .filter(Boolean);
    const set = new Set(roles);
    // Usuario normal siempre visible
    set.add(DEFAULT_ROLE_NAME);
    if (user.role_name) set.add(String(user.role_name).toLowerCase());
    const order = ['user', 'admin', 'marketing'];
    return [...set].sort((a, b) => order.indexOf(a) - order.indexOf(b) || a.localeCompare(b));
  }

  availableRolesToAdd(user: AdminUser): AdminRoleItem[] {
    const current = new Set(this.userRoles(user));
    // No ofrecer "user": ya está siempre asignado
    return this.rolesCatalogue().filter(
      (r) => r.name && r.name !== DEFAULT_ROLE_NAME && !current.has(r.name),
    );
  }

  private applyUserUpdate(updated: AdminUser): void {
    this.selectedUser.set(updated);
    this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
  }

  assignRole(user: AdminUser): void {
    const roleName = this.roleToAdd.trim().toLowerCase();
    if (!roleName || this.rolesBusy()) return;
    this.rolesBusy.set(true);
    this.detailError.set(null);
    this.detailSuccess.set(null);
    this.usersApi.assignRole(user.id, roleName).subscribe({
      next: (res) => {
        this.rolesBusy.set(false);
        this.roleToAdd = '';
        if (res.user) this.applyUserUpdate(res.user);
        this.detailSuccess.set(res.message || `Rol '${this.roleDisplay(roleName)}' asignado`);
      },
      error: (err) => {
        this.rolesBusy.set(false);
        this.detailError.set(err?.error?.detail || 'No se pudo asignar el rol');
      },
    });
  }

  removeRole(user: AdminUser, roleName: string): void {
    if (this.rolesBusy()) return;
    const name = roleName.trim().toLowerCase();
    if (!name || !this.canRemoveRole(name)) return;
    this.rolesBusy.set(true);
    this.detailError.set(null);
    this.detailSuccess.set(null);
    this.usersApi.removeRole(user.id, name).subscribe({
      next: (res) => {
        this.rolesBusy.set(false);
        if (res.user) this.applyUserUpdate(res.user);
        this.detailSuccess.set(res.message || `Rol '${this.roleDisplay(name)}' eliminado`);
      },
      error: (err) => {
        this.rolesBusy.set(false);
        this.detailError.set(err?.error?.detail || 'No se pudo eliminar el rol');
      },
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

  private openUserFromQuery(id: number): void {
    if (this.openingQueryId === id && this.selectedUser()?.id === id) return;
    this.openingQueryId = id;
    this.activeTab.set('users');

    const cached = this.users().find((u) => u.id === id);
    if (cached) {
      this.openDetail(cached);
      this.clearQueryId();
      return;
    }

    this.usersApi.getById(id).subscribe({
      next: (res) => {
        if (res.result) {
          this.openDetail(res.result);
        }
        this.clearQueryId();
      },
      error: () => this.clearQueryId(),
    });
  }

  setTab(tab: UsersTab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.blacklistError.set(null);
    this.success.set(null);
    if (tab === 'blacklist') {
      this.loadBlacklist();
    }
  }

  private flashSuccess(message: string): void {
    this.success.set(message);
    setTimeout(() => {
      if (this.success() === message) this.success.set(null);
    }, 3500);
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersApi
      .getList({
        search: this.searchQuery,
        role: this.selectedRole === 'all' ? null : this.selectedRole,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          const items = res.result || [];
          this.users.set(items);
          this.total.set(res.total || 0);
          this.loading.set(false);
          const selected = this.selectedUser();
          if (selected) {
            const fresh = items.find((u) => u.id === selected.id);
            if (fresh) this.selectedUser.set(fresh);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.detail || 'No se pudo cargar la lista de usuarios');
        },
      });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadData();
  }

  onLimitChange(value: number | string): void {
    this.limit.set(Number(value));
    this.page.set(1);
    this.loadData();
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadData();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.loadData();
  }

  openDetail(user: AdminUser): void {
    this.selectedUser.set(user);
    this.isEditing.set(false);
    this.detailError.set(null);
    this.detailSuccess.set(null);
    this.roleToAdd = '';
    if (this.rolesCatalogue().length === 0) {
      this.loadRolesCatalogue();
    }
  }

  closeDetail(): void {
    this.selectedUser.set(null);
    this.isEditing.set(false);
    this.detailError.set(null);
    this.detailSuccess.set(null);
  }

  startEdit(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.isEditing.set(true);
    this.detailError.set(null);
    this.detailSuccess.set(null);
    this.editForm = {
      username: user.username,
      role_id: user.role_id,
      password: '',
    };
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.detailError.set(null);
  }

  saveEdit(): void {
    const user = this.selectedUser();
    if (!user) return;

    const payload: AdminUserUpdatePayload = {
      role_id: Number(this.editForm.role_id),
    };
    if (this.editForm.password?.trim()) {
      payload.password = this.editForm.password.trim();
    }

    this.saving.set(true);
    this.detailError.set(null);
    this.usersApi.update(user.id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.result) {
          this.selectedUser.set(res.result);
        }
        this.isEditing.set(false);
        this.detailSuccess.set('Usuario actualizado correctamente');
        this.loadData();
      },
      error: (err) => {
        this.saving.set(false);
        this.detailError.set(err?.error?.detail || 'No se pudo guardar el usuario');
      },
    });
  }

  askDelete(user: AdminUser): void {
    this.deleteTarget.set(user);
    this.deleteError.set(null);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const user = this.deleteTarget();
    if (!user) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.usersApi.delete(user.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDelete();
        this.closeDetail();
        this.loadData();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(err?.error?.detail || 'No se pudo eliminar el usuario');
      },
    });
  }

  toggleLegalHold(user: AdminUser): void {
    if (!user) return;
    const newStatus = !user.legal_hold;
    this.usersApi.updateLegalHold(user.id, newStatus).subscribe({
      next: (res) => {
        if (res.result) {
          this.selectedUser.set(res.result);
          // Also update in the list
          this.users.update(list => list.map(u => u.id === res.result!.id ? res.result! : u));
        }
        this.detailSuccess.set(res.message || 'Estado actualizado');
      },
      error: (err) => {
        this.detailError.set(err?.error?.detail || 'No se pudo actualizar la retención legal');
      }
    });
  }

  enforcementStatus(user: AdminUser): string {
    return (user.enforcement?.status || 'ACTIVE').toUpperCase();
  }

  enforcementLabel(user: AdminUser): string {
    if (user.deleted) return 'Eliminado';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return 'Suspendido';
      case 'BANNED':
        return 'Baneado';
      case 'RESTRICTED':
        return 'Restringido';
      default:
        return 'Activo';
    }
  }

  enforcementHint(user: AdminUser): string {
    if (user.deleted) return 'La cuenta fue eliminada y anonimizada';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return 'No puede iniciar sesión mientras dure la suspensión';
      case 'BANNED':
        return 'Acceso bloqueado de forma permanente';
      case 'RESTRICTED':
        return 'Puede entrar, pero no vender, ofertar ni enviar mensajes';
      default:
        return 'No hay restricciones activas';
    }
  }

  enforcementToneClass(user: AdminUser): string {
    if (user.deleted) return 'text-slate-600';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return 'text-amber-600';
      case 'BANNED':
        return 'text-rose-600';
      case 'RESTRICTED':
        return 'text-violet-600';
      default:
        return 'text-emerald-600';
    }
  }

  enforcementIconClass(user: AdminUser): string {
    const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ';
    if (user.deleted) return base + 'bg-slate-100 text-slate-500 ring-slate-200';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return base + 'bg-amber-50 text-amber-600 ring-amber-100';
      case 'BANNED':
        return base + 'bg-rose-50 text-rose-600 ring-rose-100';
      case 'RESTRICTED':
        return base + 'bg-violet-50 text-violet-600 ring-violet-100';
      default:
        return base + 'bg-emerald-50 text-emerald-600 ring-emerald-100';
    }
  }

  enforcementIconPath(user: AdminUser): string {
    const status = user.deleted ? 'DELETED' : this.enforcementStatus(user);
    switch (status) {
      case 'SUSPENDED':
        return 'M12 9v3.75m0 3.5h.008M10.34 3.94l-7.1 12.3A1.5 1.5 0 004.54 18.5h14.92a1.5 1.5 0 001.3-2.26l-7.1-12.3a1.5 1.5 0 00-2.6 0z';
      case 'BANNED':
      case 'DELETED':
        return 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'RESTRICTED':
        return 'M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-1.5 0h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 016 10.5z';
      default:
        return 'M9 12.75l2.25 2.25 4.5-4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  enforcementPillClass(user: AdminUser): string {
    const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return base + 'bg-amber-50 text-amber-700 ring-amber-200';
      case 'BANNED':
        return base + 'bg-rose-50 text-rose-700 ring-rose-200';
      case 'RESTRICTED':
        return base + 'bg-violet-50 text-violet-700 ring-violet-200';
      default:
        return base + 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    }
  }

  enforcementHeroBadgeClass(user: AdminUser): string {
    const base = 'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ';
    switch (this.enforcementStatus(user)) {
      case 'SUSPENDED':
        return base + 'bg-amber-400/30 text-amber-100 ring-amber-300/50';
      case 'BANNED':
        return base + 'bg-red-400/30 text-red-100 ring-red-300/50';
      case 'RESTRICTED':
        return base + 'bg-violet-400/30 text-violet-100 ring-violet-300/50';
      default:
        return base + 'bg-emerald-400/30 text-emerald-100 ring-emerald-300/50';
    }
  }

  openSanction(status: AccountEnforcementStatus, days: number | null): void {
    this.sanctionStatus.set(status);
    this.sanctionDays.set(days);
    this.sanctionDaysModel = days ?? 30;
    this.sanctionReason = '';
    this.sanctionError.set(null);
    this.sanctionOpen.set(true);
  }

  closeSanction(): void {
    this.sanctionOpen.set(false);
    this.sanctionError.set(null);
  }

  sanctionTitle(): string {
    switch (this.sanctionStatus()) {
      case 'ACTIVE':
        return 'Reactivar cuenta';
      case 'SUSPENDED':
        return 'Suspender cuenta';
      case 'RESTRICTED':
        return 'Restringir marketplace';
      case 'BANNED':
        return 'Ban indefinido';
      default:
        return 'Cambiar estado';
    }
  }

  sanctionDescription(): string {
    switch (this.sanctionStatus()) {
      case 'ACTIVE':
        return 'El usuario recuperará acceso completo a la plataforma.';
      case 'SUSPENDED':
        return 'No podrá iniciar sesión hasta que expire el plazo o lo reactives.';
      case 'RESTRICTED':
        return 'Podrá entrar, pero no vender, ofertar ni enviar mensajes.';
      case 'BANNED':
        return 'Bloqueo permanente de acceso hasta reactivación manual.';
      default:
        return '';
    }
  }

  confirmSanction(): void {
    const user = this.selectedUser();
    if (!user) return;

    const status = this.sanctionStatus();
    const reason = this.sanctionReason.trim();
    if (this.enforcementStatus(user) === 'SUSPENDED' && status !== 'ACTIVE' && status !== 'BANNED') {
      this.sanctionError.set('Para un usuario suspendido, únicamente se permite la opción de baneo o reactivación.');
      return;
    }
    if (status !== 'ACTIVE' && !reason) {
      this.sanctionError.set('El motivo es obligatorio.');
      return;
    }

    const payload: AdminUserStatusPayload = {
      status,
      reason: reason || (status === 'ACTIVE' ? 'Reactivado por administrador' : undefined),
    };

    if (status === 'SUSPENDED') {
      payload.duration_days = Number(this.sanctionDaysModel) || 30;
    } else if (status === 'RESTRICTED' && this.sanctionDays() !== null) {
      payload.duration_days = Number(this.sanctionDaysModel) || 30;
    }

    this.sanctionSaving.set(true);
    this.sanctionError.set(null);
    this.usersApi.updateStatus(user.id, payload).subscribe({
      next: (res) => {
        this.sanctionSaving.set(false);
        this.sanctionOpen.set(false);
        if (res.result) {
          this.selectedUser.set(res.result);
        }
        this.detailSuccess.set(res.message || 'Estado actualizado');
        this.loadData();
      },
      error: (err) => {
        this.sanctionSaving.set(false);
        this.sanctionError.set(err?.error?.detail || 'No se pudo actualizar el estado');
      },
    });
  }

  loadBlacklist(): void {
    this.blacklistLoading.set(true);
    this.blacklistError.set(null);
    this.usersApi
      .getBlacklist({
        search: this.blacklistSearchQuery,
        page: this.blacklistPage(),
        limit: this.blacklistLimit(),
      })
      .subscribe({
        next: (res) => {
          this.blacklist.set(res.result || []);
          this.blacklistTotal.set(res.total || 0);
          this.blacklistLoading.set(false);
        },
        error: (err) => {
          this.blacklistLoading.set(false);
          this.blacklistError.set(
            err?.error?.detail || 'No se pudo cargar la lista negra',
          );
        },
      });
  }

  onBlacklistSearch(): void {
    this.blacklistPage.set(1);
    this.loadBlacklist();
  }

  onBlacklistLimitChange(value: number | string): void {
    this.blacklistLimit.set(Number(value));
    this.blacklistPage.set(1);
    this.loadBlacklist();
  }

  blacklistPrevPage(): void {
    if (this.blacklistPage() <= 1) return;
    this.blacklistPage.update((p) => p - 1);
    this.loadBlacklist();
  }

  blacklistNextPage(): void {
    if (this.blacklistPage() >= this.blacklistTotalPages()) return;
    this.blacklistPage.update((p) => p + 1);
    this.loadBlacklist();
  }

  openBlacklistCreate(): void {
    this.blacklistEditing.set(false);
    this.blacklistEditId = null;
    this.blacklistForm = { email: '', reason: '' };
    this.blacklistModalError.set(null);
    this.blacklistModalOpen.set(true);
  }

  openBlacklistEdit(row: EmailBlacklistItem): void {
    this.blacklistEditing.set(true);
    this.blacklistEditId = row.id;
    this.blacklistForm = { email: row.email, reason: row.reason || '' };
    this.blacklistModalError.set(null);
    this.blacklistModalOpen.set(true);
  }

  closeBlacklistModal(): void {
    this.blacklistModalOpen.set(false);
    this.blacklistModalError.set(null);
  }

  saveBlacklist(): void {
    const email = this.blacklistForm.email.trim().toLowerCase();
    const reason = this.blacklistForm.reason.trim();

    if (this.blacklistEditing()) {
      const id = this.blacklistEditId;
      if (id == null) return;
      this.blacklistSaving.set(true);
      this.blacklistModalError.set(null);
      this.usersApi.updateBlacklist(id, { reason: reason || null }).subscribe({
        next: () => {
          this.blacklistSaving.set(false);
          this.closeBlacklistModal();
          this.flashSuccess('Motivo actualizado');
          this.loadBlacklist();
        },
        error: (err) => {
          this.blacklistSaving.set(false);
          this.blacklistModalError.set(
            err?.error?.detail || 'No se pudo actualizar el registro',
          );
        },
      });
      return;
    }

    if (!email || !email.includes('@')) {
      this.blacklistModalError.set('Ingresa un correo válido');
      return;
    }

    this.blacklistSaving.set(true);
    this.blacklistModalError.set(null);
    this.usersApi.addBlacklist({ email, reason: reason || undefined }).subscribe({
      next: () => {
        this.blacklistSaving.set(false);
        this.closeBlacklistModal();
        this.flashSuccess('Correo agregado a la lista negra');
        this.blacklistPage.set(1);
        this.loadBlacklist();
      },
      error: (err) => {
        this.blacklistSaving.set(false);
        this.blacklistModalError.set(
          err?.error?.detail || 'No se pudo agregar el correo',
        );
      },
    });
  }

  askBlacklistDelete(row: EmailBlacklistItem): void {
    this.blacklistDeleteTarget.set(row);
    this.blacklistDeleteError.set(null);
  }

  closeBlacklistDelete(): void {
    this.blacklistDeleteTarget.set(null);
    this.blacklistDeleteError.set(null);
  }

  confirmBlacklistDelete(): void {
    const row = this.blacklistDeleteTarget();
    if (!row) return;
    this.blacklistSaving.set(true);
    this.blacklistDeleteError.set(null);
    this.usersApi.deleteBlacklist(row.id).subscribe({
      next: () => {
        this.blacklistSaving.set(false);
        this.closeBlacklistDelete();
        this.flashSuccess('Correo eliminado de la lista negra');
        this.loadBlacklist();
      },
      error: (err) => {
        this.blacklistSaving.set(false);
        this.blacklistDeleteError.set(
          err?.error?.detail || 'No se pudo eliminar el registro',
        );
      },
    });
  }
}

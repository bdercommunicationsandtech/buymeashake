import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersApiService } from '../../core/services/users-api.service';
import {
  ActiveSuspensionItem,
  AdminUserCatalogItem,
  EmailBlacklistCreatePayload,
  EmailBlacklistItem,
  AppealBanPayload,
  AppealStrikePayload,
  EmailBlacklistUpdatePayload,
  GlobalSanctionItem,
  IssueStrikePayload,
  IssueWarningPayload,
  SuspendUserPayload,
} from '../../core/models/user.model';

export type SanctionsTab = 'vetos' | 'suspensiones' | 'historial';
export type DisciplinaryActionType = 'ban' | 'suspension' | 'strike' | 'warning';

@Component({
  selector: 'app-blacklist-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">

      <!-- Header Section -->
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="mb-1.5 flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
              Centro Integral de Integridad, Moderación y Disciplina
            </span>
          </div>
          <h2 class="text-2xl font-extrabold tracking-tight text-slate-900">
            Control de Sanciones y Suspensiones
          </h2>
          <p class="mt-1 text-sm text-slate-500 max-w-2xl">
            Gestión completa de vetos permanentes, suspensiones temporales automáticas, strikes de conducta y advertencias preventivas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Botón Recargar / Sincronizar -->
          <button
            type="button"
            (click)="reloadCurrentTab()"
            [disabled]="refreshing()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            title="Sincronizar datos"
          >
            <svg class="h-4 w-4 text-slate-500" [class.animate-spin]="refreshing()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar</span>
          </button>

          <!-- Botón Aplicar Medida Disciplinaria -->
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
          >
            <span class="flex h-5 w-5 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
              <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span>Aplicar Medida Disciplinaria</span>
          </button>
        </div>
      </div>

      <!-- Feedback Banner -->
      @if (feedbackMessage()) {
        <div
          class="mb-6 flex items-center justify-between rounded-2xl border p-4 transition-all"
          [class.bg-emerald-50]="feedbackType() === 'success'"
          [class.border-emerald-200]="feedbackType() === 'success'"
          [class.text-emerald-800]="feedbackType() === 'success'"
          [class.bg-rose-50]="feedbackType() === 'error'"
          [class.border-rose-200]="feedbackType() === 'error'"
          [class.text-rose-800]="feedbackType() === 'error'"
        >
          <div class="flex items-center gap-2.5 text-sm font-semibold">
            @if (feedbackType() === 'success') {
              <svg class="h-5 w-5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            } @else {
              <svg class="h-5 w-5 text-rose-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            }
            <span>{{ feedbackMessage() }}</span>
          </div>
          <button type="button" (click)="feedbackMessage.set(null)" class="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      }

      <!-- TABS NAVIGATION BAR -->
      <div class="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <!-- Pestaña 1: Vetos Permanentes -->
        <button
          type="button"
          (click)="setTab('vetos')"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          [class.bg-rose-50]="activeTab() === 'vetos'"
          [class.text-rose-700]="activeTab() === 'vetos'"
          [class.border]="activeTab() === 'vetos'"
          [class.border-rose-200]="activeTab() === 'vetos'"
          [class.text-slate-600]="activeTab() !== 'vetos'"
          [class.hover:bg-slate-50]="activeTab() !== 'vetos'"
        >
          <span class="flex h-2 w-2 rounded-full" [class.bg-rose-500]="activeTab() === 'vetos'" [class.bg-slate-300]="activeTab() !== 'vetos'"></span>
          <span>Vetos Permanentes (Lista Negra)</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            [class.bg-rose-200]="activeTab() === 'vetos'"
            [class.text-rose-800]="activeTab() === 'vetos'"
            [class.bg-slate-100]="activeTab() !== 'vetos'"
            [class.text-slate-600]="activeTab() !== 'vetos'"
          >
            {{ totalBlacklist() }}
          </span>
        </button>

        <!-- Pestaña 2: Suspensiones Temporales -->
        <button
          type="button"
          (click)="setTab('suspensiones')"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          [class.bg-amber-50]="activeTab() === 'suspensiones'"
          [class.text-amber-800]="activeTab() === 'suspensiones'"
          [class.border]="activeTab() === 'suspensiones'"
          [class.border-amber-200]="activeTab() === 'suspensiones'"
          [class.text-slate-600]="activeTab() !== 'suspensiones'"
          [class.hover:bg-slate-50]="activeTab() !== 'suspensiones'"
        >
          <span class="flex h-2 w-2 rounded-full" [class.bg-amber-500]="activeTab() === 'suspensiones'" [class.bg-slate-300]="activeTab() !== 'suspensiones'"></span>
          <span>Suspensiones Temporales Activas</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            [class.bg-amber-200]="activeTab() === 'suspensiones'"
            [class.text-amber-900]="activeTab() === 'suspensiones'"
            [class.bg-slate-100]="activeTab() !== 'suspensiones'"
            [class.text-slate-600]="activeTab() !== 'suspensiones'"
          >
            {{ totalSuspensions() }}
          </span>
        </button>

        <!-- Pestaña 3: Historial Global -->
        <button
          type="button"
          (click)="setTab('historial')"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          [class.bg-slate-100]="activeTab() === 'historial'"
          [class.text-slate-900]="activeTab() === 'historial'"
          [class.border]="activeTab() === 'historial'"
          [class.border-slate-300]="activeTab() === 'historial'"
          [class.text-slate-600]="activeTab() !== 'historial'"
          [class.hover:bg-slate-50]="activeTab() !== 'historial'"
        >
          <span class="flex h-2 w-2 rounded-full" [class.bg-slate-800]="activeTab() === 'historial'" [class.bg-slate-300]="activeTab() !== 'historial'"></span>
          <span>Historial Global de Sanciones</span>
          <span
            class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            [class.bg-slate-200]="activeTab() === 'historial'"
            [class.text-slate-800]="activeTab() === 'historial'"
            [class.bg-slate-100]="activeTab() !== 'historial'"
            [class.text-slate-600]="activeTab() !== 'historial'"
          >
            {{ totalGlobal() }}
          </span>
        </button>
      </div>

      <!-- ================================================================= -->
      <!-- CONTENIDO PESTAÑA 1: VETOS PERMANENTES (LISTA NEGRA) -->
      <!-- ================================================================= -->
      @if (activeTab() === 'vetos') {
        <!-- Search Input -->
        <div class="mb-5 flex items-center justify-between">
          <div class="relative w-full max-w-md">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="searchBlacklist()"
              (ngModelChange)="onSearchBlacklistInput($event)"
              placeholder="Buscar por correo o motivo de veto..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-9 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            @if (searchBlacklist()) {
              <button
                type="button"
                (click)="clearSearchBlacklist()"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center gap-3">
              <svg class="h-8 w-8 animate-spin text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p class="text-xs font-semibold text-slate-500">Cargando lista negra...</p>
            </div>
          </div>
        } @else if (blacklistItems().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-800">No hay correos en la lista negra</p>
            <p class="mt-1 text-xs text-slate-500">
              @if (searchBlacklist()) {
                No se encontraron coincidencias para "{{ searchBlacklist() }}".
              } @else {
                Ningún correo se encuentra vetado permanentemente en la plataforma.
              }
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto rounded-2xl border border-slate-100">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th class="px-5 py-3.5">Correo Vetado</th>
                  <th class="px-5 py-3.5">Motivo / Causa</th>
                  <th class="px-5 py-3.5">ID Usuario</th>
                  <th class="px-5 py-3.5">Fecha de Veto</th>
                  <th class="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                @for (item of blacklistItems(); track item.id) {
                  <tr class="transition-colors hover:bg-slate-50/70">
                    <td class="px-5 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </span>
                        <span class="font-bold text-slate-900">{{ item.email }}</span>
                      </div>
                    </td>

                    <td class="px-5 py-4">
                      <span class="text-xs text-slate-700 line-clamp-2 max-w-xs">
                        {{ item.reason || 'Sin motivo especificado' }}
                      </span>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      @if (item.user_id) {
                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700">
                          User #{{ item.user_id }}
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400 italic">Externo / Preventivo</span>
                      }
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap text-slate-500">
                      {{ item.created_at ? (item.created_at | date: 'dd/MM/yyyy HH:mm') : '—' }}
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          (click)="openAppealModal(item)"
                          class="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 cursor-pointer"
                          title="Aceptar apelación formal y rehabilitar usuario"
                        >
                          Apelar
                        </button>
                        <button
                          type="button"
                          (click)="openEditBlacklistModal(item)"
                          class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          (click)="openDeleteBlacklistModal(item)"
                          class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 hover:text-rose-800 cursor-pointer"
                        >
                          Desvetar
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalBlacklist() > 0) {
            <div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div class="text-xs text-slate-500">
                Mostrando <strong class="text-slate-800">{{ ((pageBlacklist() - 1) * limitBlacklist()) + 1 }}</strong> a <strong class="text-slate-800">{{ mathMin(pageBlacklist() * limitBlacklist(), totalBlacklist()) }}</strong> de <strong class="text-slate-800">{{ totalBlacklist() }}</strong>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  [disabled]="pageBlacklist() <= 1"
                  (click)="changeBlacklistPage(pageBlacklist() - 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <span class="text-xs font-semibold text-slate-600">Pág. {{ pageBlacklist() }} de {{ totalBlacklistPages() }}</span>
                <button
                  type="button"
                  [disabled]="pageBlacklist() >= totalBlacklistPages()"
                  (click)="changeBlacklistPage(pageBlacklist() + 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      }

      <!-- ================================================================= -->
      <!-- CONTENIDO PESTAÑA 2: SUSPENSIONES TEMPORALES ACTIVAS -->
      <!-- ================================================================= -->
      @if (activeTab() === 'suspensiones') {
        <div class="mb-5 flex items-center justify-between">
          <div class="relative w-full max-w-md">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="searchSuspensions()"
              (ngModelChange)="onSearchSuspensionsInput($event)"
              placeholder="Buscar usuario suspendido por nombre, correo o motivo..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-9 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            @if (searchSuspensions()) {
              <button
                type="button"
                (click)="clearSearchSuspensions()"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center gap-3">
              <svg class="h-8 w-8 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p class="text-xs font-semibold text-slate-500">Cargando suspensiones temporales...</p>
            </div>
          </div>
        } @else if (suspensionItems().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-800">No hay suspensiones temporales activas</p>
            <p class="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Todas las cuentas están al día o sus plazos temporales concluyeron y se reactivaron automáticamente.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto rounded-2xl border border-slate-100">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th class="px-5 py-3.5">Usuario Suspendido</th>
                  <th class="px-5 py-3.5">Tiempo Restante</th>
                  <th class="px-5 py-3.5">Período y Reactivación</th>
                  <th class="px-5 py-3.5">Motivo y Categoría</th>
                  <th class="px-5 py-3.5">Emitido Por</th>
                  <th class="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                @for (s of suspensionItems(); track s.id) {
                  <tr class="transition-colors hover:bg-slate-50/70">
                    <!-- Usuario -->
                    <td class="px-5 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2.5">
                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 font-bold">
                          @if (s.avatar_url) {
                            <img [src]="s.avatar_url" [alt]="s.full_name || s.email" class="h-full w-full object-cover rounded-xl" />
                          } @else {
                            <span>{{ ((s.full_name || s.email)[0]) | uppercase }}</span>
                          }
                        </div>
                        <div>
                          <p class="font-bold text-slate-900">{{ s.full_name || 'Sin nombre' }}</p>
                          <p class="text-[11px] font-mono text-slate-500">{{ s.email }}</p>
                          @if (s.handle) {
                            <span class="text-[10px] font-semibold text-violet-600">@{{ s.handle }}</span>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Tiempo Restante -->
                    <td class="px-5 py-4 whitespace-nowrap">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                        [class.bg-amber-100]="s.days_remaining > 1"
                        [class.text-amber-800]="s.days_remaining > 1"
                        [class.bg-rose-100]="s.days_remaining <= 1"
                        [class.text-rose-800]="s.days_remaining <= 1"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" [class.bg-amber-600]="s.days_remaining > 1" [class.bg-rose-600]="s.days_remaining <= 1"></span>
                        @if (s.days_remaining > 0) {
                          {{ s.days_remaining }} día{{ s.days_remaining !== 1 ? 's' : '' }} restante{{ s.days_remaining !== 1 ? 's' : '' }}
                        } @else {
                          Menos de 24h
                        }
                      </span>
                    </td>

                    <!-- Período -->
                    <td class="px-5 py-4 whitespace-nowrap text-xs">
                      <div class="text-slate-700">
                        <span class="font-semibold text-slate-900">Fin:</span> {{ s.expires_at ? (s.expires_at | date: 'dd/MM/yyyy HH:mm') : 'Indefinido' }}
                      </div>
                      <div class="text-[11px] text-slate-400">
                        Inició: {{ s.starts_at | date: 'dd/MM/yyyy' }}
                      </div>
                    </td>

                    <!-- Motivo -->
                    <td class="px-5 py-4">
                      <span class="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        {{ s.category }}
                      </span>
                      <p class="text-xs text-slate-700 line-clamp-2 max-w-xs">
                        {{ s.reason }}
                      </p>
                    </td>

                    <!-- Emitido Por -->
                    <td class="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                      {{ s.created_by_name || 'Admin' }}
                    </td>

                    <!-- Botón Levantar -->
                    <td class="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        (click)="openUnsuspendModal(s)"
                        class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-xs transition hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer"
                        title="Levantar suspensión anticipadamente"
                      >
                        Levantar Suspensión
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalSuspensions() > 0) {
            <div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div class="text-xs text-slate-500">
                Mostrando <strong class="text-slate-800">{{ ((pageSuspensions() - 1) * limitSuspensions()) + 1 }}</strong> a <strong class="text-slate-800">{{ mathMin(pageSuspensions() * limitSuspensions(), totalSuspensions()) }}</strong> de <strong class="text-slate-800">{{ totalSuspensions() }}</strong>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  [disabled]="pageSuspensions() <= 1"
                  (click)="changeSuspensionsPage(pageSuspensions() - 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <span class="text-xs font-semibold text-slate-600">Pág. {{ pageSuspensions() }} de {{ totalSuspensionsPages() }}</span>
                <button
                  type="button"
                  [disabled]="pageSuspensions() >= totalSuspensionsPages()"
                  (click)="changeSuspensionsPage(pageSuspensions() + 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      }

      <!-- ================================================================= -->
      <!-- CONTENIDO PESTAÑA 3: HISTORIAL GLOBAL DE SANCIONES -->
      <!-- ================================================================= -->
      @if (activeTab() === 'historial') {
        <div class="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <!-- Search -->
          <div class="relative w-full max-w-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="searchGlobal()"
              (ngModelChange)="onSearchGlobalInput($event)"
              placeholder="Buscar en historial..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
            @if (searchGlobal()) {
              <button
                type="button"
                (click)="clearSearchGlobal()"
                class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            }
          </div>

          <!-- Filtros de Tipo y Categoría -->
          <div class="flex flex-wrap items-center gap-2">
            <select
              [ngModel]="filterActionType()"
              (ngModelChange)="onFilterActionTypeChange($event)"
              class="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-slate-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las medidas</option>
              <option value="ban">Vetos (Bans)</option>
              <option value="suspension">Suspensiones</option>
              <option value="strike">Strikes</option>
              <option value="warning">Advertencias</option>
            </select>

            <select
              [ngModel]="filterCategory()"
              (ngModelChange)="onFilterCategoryChange($event)"
              class="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-slate-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              <option value="conduct">Conducta general</option>
              <option value="fraud">Fraude / Pagos</option>
              <option value="spam">Spam / Publicidad</option>
              <option value="content">Contenido prohibido</option>
              <option value="harassment">Acoso / Lenguaje</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center gap-3">
              <svg class="h-8 w-8 animate-spin text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p class="text-xs font-semibold text-slate-500">Cargando historial...</p>
            </div>
          </div>
        } @else if (globalItems().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <p class="text-sm font-bold text-slate-800">No se encontraron sanciones registradas</p>
            <p class="mt-1 text-xs text-slate-500">No hay registros con los filtros seleccionados.</p>
          </div>
        } @else {
          <div class="overflow-x-auto rounded-2xl border border-slate-100">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th class="px-5 py-3.5">Usuario</th>
                  <th class="px-5 py-3.5">Medida Aplicada</th>
                  <th class="px-5 py-3.5">Categoría</th>
                  <th class="px-5 py-3.5">Motivo</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Estado</th>
                  <th class="px-5 py-3.5">Emitido Por</th>
                  <th class="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                @for (item of globalItems(); track item.id) {
                  <tr class="transition-colors hover:bg-slate-50/70">
                    <td class="px-5 py-4 whitespace-nowrap">
                      <div class="font-bold text-slate-900">{{ item.full_name || 'Sin nombre' }}</div>
                      <div class="font-mono text-[11px] text-slate-500">{{ item.email }}</div>
                      @if (item.handle) {
                        <span class="text-[10px] text-violet-600 font-semibold">@{{ item.handle }}</span>
                      }
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      @if (item.action_type === 'ban') {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">
                          <svg class="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span>Veto Permanente</span>
                        </span>
                      } @else if (item.action_type === 'suspension') {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                          <svg class="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                          </svg>
                          <span>Suspensión Temporal</span>
                        </span>
                      } @else if (item.action_type === 'strike') {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-extrabold text-yellow-800">
                          <svg class="h-3.5 w-3.5 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <span>Strike (+{{ item.points }} pt)</span>
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-700">
                          <svg class="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          <span>Advertencia Formal</span>
                        </span>
                      }
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {{ item.category }}
                      </span>
                    </td>

                    <td class="px-5 py-4">
                      <span class="text-xs text-slate-700 line-clamp-2 max-w-xs">{{ item.reason }}</span>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                      {{ item.created_at | date: 'dd/MM/yyyy HH:mm' }}
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      @if (item.is_active) {
                        <span class="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          Activa
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          Concluida / Inactiva
                        </span>
                      }
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                      {{ item.created_by_name || 'Admin' }}
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap text-right">
                      @if (item.action_type === 'ban' && item.is_active) {
                        <button
                          type="button"
                          (click)="openAppealModal(item)"
                          class="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 cursor-pointer"
                          title="Aceptar apelación formal y restaurar usuario"
                        >
                          Apelar Baneo
                        </button>
                      } @else if (item.action_type === 'suspension' && item.is_active) {
                        <button
                          type="button"
                          (click)="openUnsuspendModalFromGlobal(item)"
                          class="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 cursor-pointer"
                          title="Levantar suspensión anticipadamente"
                        >
                          Levantar
                        </button>
                      } @else if (item.action_type === 'strike' && item.is_active) {
                        <button
                          type="button"
                          (click)="openAppealStrikeModal(item)"
                          class="rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800 shadow-sm transition hover:bg-yellow-100 cursor-pointer"
                          title="Aceptar apelación y anular este strike"
                        >
                          Apelar Strike
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalGlobal() > 0) {
            <div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div class="text-xs text-slate-500">
                Mostrando <strong class="text-slate-800">{{ ((pageGlobal() - 1) * limitGlobal()) + 1 }}</strong> a <strong class="text-slate-800">{{ mathMin(pageGlobal() * limitGlobal(), totalGlobal()) }}</strong> de <strong class="text-slate-800">{{ totalGlobal() }}</strong>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  [disabled]="pageGlobal() <= 1"
                  (click)="changeGlobalPage(pageGlobal() - 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <span class="text-xs font-semibold text-slate-600">Pág. {{ pageGlobal() }} de {{ totalGlobalPages() }}</span>
                <button
                  type="button"
                  [disabled]="pageGlobal() >= totalGlobalPages()"
                  (click)="changeGlobalPage(pageGlobal() + 1)"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      }

    </div>

    <!-- ================================================================= -->
    <!-- MODAL MULTIACCIÓN: APLICAR MEDIDA DISCIPLINARIA -->
    <!-- ================================================================= -->
    @if (showAddModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">

          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
            <div class="flex items-center gap-2.5">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <div>
                <h3 class="text-base font-bold text-slate-900">Aplicar Medida Disciplinaria</h3>
                <p class="text-xs text-slate-500">
                  Selecciona el nivel de sanción, usuario y justificación formal.
                </p>
              </div>
            </div>
            <button type="button" (click)="showAddModal.set(false)" class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <!-- Modal Scrollable Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">

            <!-- BANNER DE ADVERTENCIA PARA USUARIO VETADO -->
            @if (isTargetUserBanned()) {
              <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-xs">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </span>
                <div class="space-y-1">
                  <div class="font-bold text-rose-900 text-sm">Usuario Vetado Permanentemente</div>
                  <p class="text-rose-700 leading-relaxed">
                    Este usuario ya se encuentra registrado en la <strong>Lista Negra</strong>. No es posible aplicarle suspensiones temporales, strikes ni advertencias ya que su cuenta carece de acceso. Para restituir su cuenta, tramita su apelación en la pestaña <strong>Vetos Permanentes</strong>.
                  </p>
                </div>
              </div>
            }

            <!-- BANNER DE ADVERTENCIA PARA USUARIO SUSPENDIDO -->
            @if (isTargetUserSuspended() && !isTargetUserBanned()) {
              <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3 shadow-xs">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                </span>
                <div class="space-y-1">
                  <div class="font-bold text-amber-900 text-sm">Usuario con Suspensión Activa</div>
                  <p class="text-amber-700 leading-relaxed">
                    Este usuario actualmente se encuentra <strong>suspendido</strong>. No es posible aplicarle strikes, advertencias ni suspensiones adicionales. La única acción disciplinaria permitida para escalar su sanción es el <strong>Veto Permanente</strong> (Lista Negra), o bien levantar su suspensión en la pestaña <strong>Suspensiones Temporales</strong>.
                  </p>
                </div>
              </div>
            }

            <!-- SELECCIÓN DE MEDIDA DISCIPLINARIA -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                1. Selecciona el Tipo de Medida
              </label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <!-- Veto Permanente -->
                <button
                  type="button"
                  (click)="selectedActionType.set('ban')"
                  class="rounded-2xl border p-3 text-left transition cursor-pointer"
                  [class.border-rose-500]="selectedActionType() === 'ban'"
                  [class.bg-rose-50/50]="selectedActionType() === 'ban'"
                  [class.border-slate-200]="selectedActionType() !== 'ban'"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-600 mb-1.5">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </span>
                  <div class="text-xs font-bold text-slate-900">Veto Permanente</div>
                  <div class="text-[10px] text-slate-500 leading-tight mt-0.5">Lista negra y bloqueo total</div>
                </button>

                <!-- Suspensión Temporal -->
                <button
                  type="button"
                  [disabled]="isTargetUserBanned() || isTargetUserSuspended()"
                  (click)="selectedActionType.set('suspension')"
                  class="rounded-2xl border p-3 text-left transition"
                  [class.cursor-pointer]="!isTargetUserBanned() && !isTargetUserSuspended()"
                  [class.cursor-not-allowed]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.opacity-40]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.border-amber-500]="selectedActionType() === 'suspension'"
                  [class.bg-amber-50/50]="selectedActionType() === 'suspension'"
                  [class.border-slate-200]="selectedActionType() !== 'suspension'"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-1.5">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  </span>
                  <div class="text-xs font-bold text-slate-900">Suspensión</div>
                  <div class="text-[10px] text-slate-500 leading-tight mt-0.5">Temporal con auto-reactivación</div>
                </button>

                <!-- Strike -->
                <button
                  type="button"
                  [disabled]="isTargetUserBanned() || isTargetUserSuspended()"
                  (click)="selectedActionType.set('strike')"
                  class="rounded-2xl border p-3 text-left transition"
                  [class.cursor-pointer]="!isTargetUserBanned() && !isTargetUserSuspended()"
                  [class.cursor-not-allowed]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.opacity-40]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.border-yellow-500]="selectedActionType() === 'strike'"
                  [class.bg-yellow-50/50]="selectedActionType() === 'strike'"
                  [class.border-slate-200]="selectedActionType() !== 'strike'"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700 mb-1.5">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </span>
                  <div class="text-xs font-bold text-slate-900">Strike (+pts)</div>
                  <div class="text-[10px] text-slate-500 leading-tight mt-0.5">Puntos acumulativos</div>
                </button>

                <!-- Advertencia -->
                <button
                  type="button"
                  [disabled]="isTargetUserBanned() || isTargetUserSuspended()"
                  (click)="selectedActionType.set('warning')"
                  class="rounded-2xl border p-3 text-left transition"
                  [class.cursor-pointer]="!isTargetUserBanned() && !isTargetUserSuspended()"
                  [class.cursor-not-allowed]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.opacity-40]="isTargetUserBanned() || isTargetUserSuspended()"
                  [class.border-slate-500]="selectedActionType() === 'warning'"
                  [class.bg-slate-100]="selectedActionType() === 'warning'"
                  [class.border-slate-200]="selectedActionType() !== 'warning'"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 text-slate-700 mb-1.5">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  </span>
                  <div class="text-xs font-bold text-slate-900">Advertencia</div>
                  <div class="text-[10px] text-slate-500 leading-tight mt-0.5">Aviso formal sin corte</div>
                </button>
              </div>
            </div>

            <!-- CONFIGURACIÓN ESPECÍFICA SEGÚN TIPO -->
            @if (selectedActionType() === 'suspension') {
              <div class="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                <label class="block text-xs font-bold text-amber-900">
                  Duración de la Suspensión Temporal (días)
                </label>
                <div class="flex flex-wrap items-center gap-2">
                  @for (days of [3, 7, 15, 30]; track days) {
                    <button
                      type="button"
                      (click)="suspensionDays = days"
                      class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                      [class.bg-amber-600]="suspensionDays === days"
                      [class.text-white]="suspensionDays === days"
                      [class.bg-white]="suspensionDays !== days"
                      [class.text-amber-900]="suspensionDays !== days"
                      [class.border]="suspensionDays !== days"
                      [class.border-amber-200]="suspensionDays !== days"
                    >
                      {{ days }} días
                    </button>
                  }
                  <div class="flex items-center gap-1.5 ml-2">
                    <span class="text-xs text-amber-800 font-semibold">Personalizado:</span>
                    <input
                      type="number"
                      [(ngModel)]="suspensionDays"
                      min="1"
                      max="365"
                      class="w-16 rounded-xl border border-amber-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <span class="text-xs text-amber-800">días</span>
                  </div>
                </div>
                <p class="flex items-center gap-1.5 text-[11px] text-amber-700 pt-1">
                  <svg class="h-3.5 w-3.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <span>La cuenta se reactivará automáticamente al expirar este plazo sin requerir intervención manual.</span>
                </p>
              </div>
            }

            @if (selectedActionType() === 'strike') {
              <div class="rounded-2xl border border-yellow-200 bg-yellow-50/40 p-4 space-y-3">
                <div class="flex flex-col sm:flex-row gap-4">
                  <div class="flex-1">
                    <label class="block text-xs font-bold text-yellow-900 mb-1.5">Puntos de Strike</label>
                    <div class="flex gap-2">
                      @for (pt of [1, 2, 3]; track pt) {
                        <button
                          type="button"
                          (click)="strikePoints = pt"
                          class="rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer"
                          [class.bg-yellow-600]="strikePoints === pt"
                          [class.text-white]="strikePoints === pt"
                          [class.bg-white]="strikePoints !== pt"
                          [class.text-yellow-900]="strikePoints !== pt"
                          [class.border]="strikePoints !== pt"
                          [class.border-yellow-200]="strikePoints !== pt"
                        >
                          +{{ pt }} {{ pt === 1 ? 'punto' : 'puntos' }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="flex-1">
                    <label class="block text-xs font-bold text-yellow-900 mb-1.5">Caducidad del Strike</label>
                    <select
                      [(ngModel)]="strikeExpirationDays"
                      class="w-full rounded-xl border border-yellow-200 bg-white p-2 text-xs font-semibold text-yellow-950 focus:outline-none"
                    >
                      <option [ngValue]="30">Expira en 30 días</option>
                      <option [ngValue]="60">Expira en 60 días</option>
                      <option [ngValue]="90">Expira en 90 días</option>
                      <option [ngValue]="null">Permanente (Sin caducidad)</option>
                    </select>
                  </div>
                </div>
                <p class="flex items-center gap-1.5 text-[11px] text-yellow-800">
                  <svg class="h-3.5 w-3.5 shrink-0 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>Si el usuario acumula 3 o más strikes activos, el sistema ejecutará un <strong>Veto Permanente Automático</strong>.</span>
                </p>
              </div>
            }

            <!-- TABLA SELECTORA DE USUARIOS ACTIVOS DE BUY ME A SHAKE -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-blue-600"></span>
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Buscar en usuarios activos de BuyMeAShake
                  </label>
                </div>
                <span class="text-[11px] font-semibold text-slate-500">
                  {{ filteredActiveUsers().length }} disponibles
                </span>
              </div>

              <!-- Input filtro de usuarios -->
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  [ngModel]="userSearchFilter()"
                  (ngModelChange)="userSearchFilter.set($event)"
                  placeholder="Filtrar por nombre, correo o @handle..."
                  class="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                @if (userSearchFilter()) {
                  <button
                    type="button"
                    (click)="userSearchFilter.set('')"
                    class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                }
              </div>

              <!-- Tabla scrollable 10 items -->
              @if (loadingActiveUsers()) {
                <div class="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                  <svg class="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Cargando usuarios...</span>
                </div>
              } @else {
                <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xs scrollbar-thin">
                  <table class="w-full text-left text-xs">
                    <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th class="px-3 py-2">Usuario</th>
                        <th class="px-3 py-2">Correo</th>
                        <th class="px-3 py-2">Rol</th>
                        <th class="px-3 py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (u of filteredActiveUsers(); track u.id) {
                        <tr
                          (click)="selectUser(u)"
                          class="transition-colors cursor-pointer"
                          [class.bg-slate-100]="selectedUser()?.id === u.id"
                          [class.hover:bg-slate-50]="selectedUser()?.id !== u.id"
                        >
                          <td class="px-3 py-2 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
                                   [class.bg-violet-600]="u.roles.includes('athlete')"
                                   [class.bg-emerald-600]="u.roles.includes('supporter') && !u.roles.includes('athlete')"
                                   [class.bg-blue-600]="u.roles.includes('admin') && !u.roles.includes('athlete')">
                                @if (u.avatar_url) {
                                  <img [src]="u.avatar_url" [alt]="u.full_name" class="h-full w-full object-cover rounded-lg" />
                                } @else {
                                  <span>{{ (u.full_name[0] || u.email[0] || '?') | uppercase }}</span>
                                }
                              </div>
                              <div class="min-w-0">
                                <p class="font-semibold text-slate-900 truncate max-w-[130px]">{{ u.full_name }}</p>
                                @if (u.athlete_handle) {
                                  <span class="text-[10px] text-violet-600 font-semibold block leading-tight">@{{ u.athlete_handle }}</span>
                                }
                              </div>
                            </div>
                          </td>

                          <td class="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-slate-700">
                            {{ u.email }}
                          </td>

                          <td class="px-3 py-2 whitespace-nowrap">
                            @if (u.roles.includes('athlete')) {
                              <span class="inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">Atleta</span>
                            } @else if (u.roles.includes('supporter')) {
                              <span class="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Supporter</span>
                            } @else if (u.roles.includes('admin')) {
                              <span class="inline-flex rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Admin</span>
                            } @else {
                              <span class="text-[10px] text-slate-400">—</span>
                            }
                          </td>

                          <td class="px-3 py-2 whitespace-nowrap text-right">
                            @if (selectedUser()?.id === u.id) {
                              <span class="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-xs">
                                <svg class="h-3 w-3 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                                <span>Elegido</span>
                              </span>
                            } @else {
                              <button
                                type="button"
                                (click)="selectUser(u); $event.stopPropagation()"
                                class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              >
                                Seleccionar
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- CAMPO DE CORREO ELECTRÓNICO -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-800">
                  Correo Electrónico *
                </label>
                @if (selectedUser(); as sel) {
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span>Usuario vinculado: <strong>{{ sel.full_name }}</strong> (#{{ sel.id }})</span>
                    <button type="button" (click)="clearSelectedUser()" class="text-emerald-800 hover:text-emerald-950 ml-1 font-bold cursor-pointer" title="Desvincular">✕</button>
                  </span>
                }
              </div>
              <input
                type="email"
                [ngModel]="targetEmail"
                (ngModelChange)="onEmailInputChange($event)"
                placeholder="ejemplo@dominio.com"
                class="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            <!-- CATEGORÍA Y MOTIVO -->
            <div class="space-y-3">
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-800">Categoría de la Infracción</label>
                <select
                  [(ngModel)]="sanctionCategory"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-slate-500 focus:bg-white focus:outline-none"
                >
                  <option value="conduct">Conducta general / Convivencia</option>
                  <option value="fraud">Fraude o transacciones sospechosas</option>
                  <option value="spam">Spam, enlaces no autorizados o autopromoción</option>
                  <option value="content">Contenido prohibido / Sustancias no autorizadas</option>
                  <option value="harassment">Acoso, hostigamiento o discurso de odio</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold text-slate-800">Motivo / Justificación *</label>
                  <span class="text-[11px] font-semibold"
                    [class.text-rose-500]="sanctionReason.trim().length < 3 || sanctionReason.trim().length > 500"
                    [class.text-emerald-600]="sanctionReason.trim().length >= 3 && sanctionReason.trim().length <= 500">
                    {{ sanctionReason.trim().length }}/500
                  </span>
                </div>
                <textarea
                  [(ngModel)]="sanctionReason"
                  rows="3"
                  maxlength="500"
                  placeholder="Detalla la justificación formal que se notificará por correo al usuario (mínimo 3 caracteres)..."
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                ></textarea>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
            <button
              type="button"
              (click)="showAddModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting() || !targetEmail.trim() || sanctionReason.trim().length < 3 || isTargetUserBanned() || (isTargetUserSuspended() && selectedActionType() !== 'ban')"
              (click)="submitDisciplinaryAction()"
              class="rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              [class.bg-rose-600]="selectedActionType() === 'ban'"
              [class.hover:bg-rose-700]="selectedActionType() === 'ban'"
              [class.bg-amber-600]="selectedActionType() === 'suspension'"
              [class.hover:bg-amber-700]="selectedActionType() === 'suspension'"
              [class.bg-yellow-600]="selectedActionType() === 'strike'"
              [class.hover:bg-yellow-700]="selectedActionType() === 'strike'"
              [class.bg-slate-900]="selectedActionType() === 'warning'"
              [class.hover:bg-slate-800]="selectedActionType() === 'warning'"
            >
              @if (submitting()) {
                <span>Procesando...</span>
              } @else if (isTargetUserBanned()) {
                <span>Usuario ya vetado en Lista Negra</span>
              } @else if (isTargetUserSuspended() && selectedActionType() !== 'ban') {
                <span>Usuario suspendido (solo Veto permitido)</span>
              } @else {
                @if (selectedActionType() === 'ban') {
                  <span>Vetar Permanentemente</span>
                } @else if (selectedActionType() === 'suspension') {
                  <span>Suspender por {{ suspensionDays }} días</span>
                } @else if (selectedActionType() === 'strike') {
                  <span>Emitir Strike (+{{ strikePoints }} pt)</span>
                } @else {
                  <span>Emitir Advertencia Formal</span>
                }
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================================================================= -->
    <!-- MODAL: LEVANTAR SUSPENSIÓN ANTICIPADA -->
    <!-- ================================================================= -->
    @if (selectedSuspensionForUnsuspend(); as sus) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">¿Rehabilitar Cuenta de Usuario?</h3>
              <p class="text-xs text-slate-500">Se levantará la suspensión temporal de inmediato.</p>
            </div>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
            <div><span class="font-bold text-slate-800">Usuario:</span> {{ sus.full_name || 'Sin nombre' }}</div>
            <div><span class="font-bold text-slate-800">Correo:</span> {{ sus.email }}</div>
            <div><span class="font-bold text-slate-800">Días restantes:</span> {{ sus.days_remaining }} días</div>
          </div>

          <p class="text-xs text-slate-600">
            Al confirmar, el usuario recibirá un correo notificándole que su acceso ha sido restaurado con éxito y sus credenciales volverán a estar habilitadas.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="selectedSuspensionForUnsuspend.set(null)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="submitUnsuspend()"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submitting() ? 'Reactivando...' : 'Confirmar y Reactivar' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================================================================= -->
    <!-- MODAL: EDITAR MOTIVO VETO (LISTA NEGRA) -->
    <!-- ================================================================= -->
    @if (selectedItemForEdit(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-900">Editar Motivo de Veto</h3>
            <button type="button" (click)="selectedItemForEdit.set(null)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            <span class="font-bold">Correo:</span> {{ item.email }}
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">Motivo</label>
              <span class="text-[11px] font-semibold"
                [class.text-rose-500]="editReason.trim().length > 255"
                [class.text-emerald-600]="editReason.trim().length <= 255">
                {{ editReason.trim().length }}/255
              </span>
            </div>
            <textarea
              [(ngModel)]="editReason"
              rows="3"
              maxlength="255"
              class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="selectedItemForEdit.set(null)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="submitEditBlacklist()"
              class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {{ submitting() ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================================================================= -->
    <!-- MODAL: CONFIRMAR DESVETO (UNBAN) -->
    <!-- ================================================================= -->
    @if (selectedItemForDelete(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">¿Remover de Lista Negra?</h3>
              <p class="text-xs text-slate-500">Se levantará el veto permanente sobre esta dirección.</p>
            </div>
          </div>

          <p class="text-xs text-slate-600">
            Al remover a <strong class="text-slate-900">{{ item.email }}</strong>, el usuario podrá volver a registrarse, solicitar códigos de verificación e iniciar sesión libremente.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="selectedItemForDelete.set(null)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting()"
              (click)="submitDeleteBlacklist()"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submitting() ? 'Removiendo...' : 'Sí, Desvetar Correo' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================================================================= -->
    <!-- MODAL: RESOLVER APELACIÓN Y REHABILITAR USUARIO -->
    <!-- ================================================================= -->
    @if (appealItem(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Aprobar Apelación y Rehabilitar Cuenta</h3>
              <p class="text-xs text-slate-500">Levantamiento formal de sanciones y restauración de credenciales.</p>
            </div>
          </div>

          <!-- User info card -->
          <div class="rounded-2xl bg-slate-50 p-4 border border-slate-200/70 text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-slate-500">Correo Electrónico:</span>
              <strong class="font-mono text-slate-900">{{ item.email }}</strong>
            </div>
            @if (getAppealItemFullName(item)) {
              <div class="flex justify-between">
                <span class="text-slate-500">Nombre del Usuario:</span>
                <strong class="text-slate-900">{{ getAppealItemFullName(item) }}</strong>
              </div>
            }
            @if (item.user_id) {
              <div class="flex justify-between">
                <span class="text-slate-500">ID de Usuario:</span>
                <strong class="font-mono text-slate-700">#{{ item.user_id }}</strong>
              </div>
            }
          </div>

          <!-- Justification textarea -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                Justificación de Resolución de la Apelación <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] font-semibold"
                [class.text-rose-500]="appealReason.trim().length < 3 || appealReason.trim().length > 500"
                [class.text-emerald-600]="appealReason.trim().length >= 3 && appealReason.trim().length <= 500">
                {{ appealReason.trim().length }}/500
              </span>
            </div>
            <textarea
              [(ngModel)]="appealReason"
              rows="3"
              maxlength="500"
              placeholder="Explica la razón por la que se aprueba la apelación (mínimo 3 caracteres)..."
              class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            ></textarea>
            <p class="text-[11px] text-slate-500">
              Esta resolución quedará registrada en el expediente disciplinario y será enviada por correo al usuario.
            </p>
          </div>

          <!-- Strike reset option -->
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 flex items-start gap-3">
            <input
              type="checkbox"
              id="appealResetStrikes"
              [(ngModel)]="appealResetStrikes"
              class="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label for="appealResetStrikes" class="text-xs text-slate-700 cursor-pointer">
              <span class="font-bold text-slate-900">Perdonar y reiniciar strikes acumulados</span>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Recomendado para evitar que el usuario vuelva a ser sancionado automáticamente por infracciones pasadas ya resueltas.
              </p>
            </label>
          </div>

          <!-- Notification indicator -->
          <div class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <svg class="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Se enviará automáticamente el correo oficial de <strong>Apelación Aprobada</strong> al usuario.</span>
          </div>

          <!-- Modal footer actions -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="appealItem.set(null)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting() || appealReason.trim().length < 3"
              (click)="submitAppeal()"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition"
            >
              {{ submitting() ? 'Aprobando...' : 'Aprobar Apelación y Restaurar' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================================================================= -->
    <!-- MODAL: RESOLVER APELACIÓN Y ANULAR STRIKE -->
    <!-- ================================================================= -->
    @if (appealStrikeItem(); as st) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shrink-0">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Aprobar Apelación y Anular Strike</h3>
              <p class="text-xs text-slate-500">Revocación de infracción y descuento de puntos acumulados.</p>
            </div>
          </div>

          <!-- Strike info card -->
          <div class="rounded-2xl bg-slate-50 p-4 border border-slate-200/70 text-xs space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Usuario:</span>
              <strong class="text-slate-900">{{ st.full_name || st.email }}</strong>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Correo Electrónico:</span>
              <strong class="font-mono text-slate-700">{{ st.email }}</strong>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Puntos a Descontar:</span>
              <span class="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                -{{ st.points }} pt
              </span>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <span class="text-[11px] text-slate-500 block mb-0.5">Motivo original de la infracción:</span>
              <span class="text-slate-800 font-medium">{{ st.reason }}</span>
            </div>
          </div>

          <!-- Justification textarea -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                Justificación de Resolución de la Apelación <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] font-semibold"
                [class.text-rose-500]="appealStrikeReason.trim().length < 3 || appealStrikeReason.trim().length > 500"
                [class.text-emerald-600]="appealStrikeReason.trim().length >= 3 && appealStrikeReason.trim().length <= 500">
                {{ appealStrikeReason.trim().length }}/500
              </span>
            </div>
            <textarea
              [(ngModel)]="appealStrikeReason"
              rows="3"
              maxlength="500"
              placeholder="Explica la razón por la que se acepta la apelación y se anula este strike (mínimo 3 caracteres)..."
              class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            ></textarea>
            <p class="text-[11px] text-slate-500">
              Esta resolución quedará registrada en el historial disciplinario y será notificada al usuario.
            </p>
          </div>

          <!-- Notification indicator -->
          <div class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <svg class="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Se enviará automáticamente el correo de <strong>Apelación Aprobada: Strike Revocado</strong>.</span>
          </div>

          <!-- Modal footer actions -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="appealStrikeItem.set(null)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submitting() || appealStrikeReason.trim().length < 3"
              (click)="submitAppealStrike()"
              class="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition"
            >
              {{ submitting() ? 'Anulando...' : 'Aprobar y Anular Strike' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BlacklistPanelComponent implements OnInit {
  private usersApi = inject(UsersApiService);

  // Tabs
  activeTab = signal<SanctionsTab>('vetos');

  // Tab 1: Vetos Permanentes
  blacklistItems = signal<EmailBlacklistItem[]>([]);
  totalBlacklist = signal<number>(0);
  pageBlacklist = signal<number>(1);
  limitBlacklist = signal<number>(20);
  searchBlacklist = signal<string>('');

  // Tab 2: Suspensiones Temporales
  suspensionItems = signal<ActiveSuspensionItem[]>([]);
  totalSuspensions = signal<number>(0);
  pageSuspensions = signal<number>(1);
  limitSuspensions = signal<number>(20);
  searchSuspensions = signal<string>('');

  // Tab 3: Historial Global
  globalItems = signal<GlobalSanctionItem[]>([]);
  totalGlobal = signal<number>(0);
  pageGlobal = signal<number>(1);
  limitGlobal = signal<number>(20);
  searchGlobal = signal<string>('');
  filterActionType = signal<string>('all');
  filterCategory = signal<string>('all');

  // Appeal Modal State
  appealItem = signal<EmailBlacklistItem | GlobalSanctionItem | null>(null);
  appealReason = '';
  appealResetStrikes = true;

  // Strike Appeal Modal State
  appealStrikeItem = signal<GlobalSanctionItem | null>(null);
  appealStrikeReason = '';

  // UI state
  loading = signal<boolean>(true);
  refreshing = signal<boolean>(false);
  submitting = signal<boolean>(false);
  feedbackMessage = signal<string | null>(null);
  feedbackType = signal<'success' | 'error'>('success');

  // Disciplinary Modal state
  showAddModal = signal<boolean>(false);
  selectedActionType = signal<DisciplinaryActionType>('ban');
  targetEmail = '';
  targetEmailValue = signal<string>('');
  sanctionCategory = 'conduct';
  sanctionReason = '';
  suspensionDays = 7;
  strikePoints = 1;
  strikeExpirationDays: number | null = 30;

  // Active users catalog selector
  activeUsers = signal<AdminUserCatalogItem[]>([]);
  loadingActiveUsers = signal<boolean>(false);
  userSearchFilter = signal<string>('');
  selectedUser = signal<AdminUserCatalogItem | null>(null);

  isTargetUserBanned = computed(() => {
    const user = this.selectedUser();
    if (user?.is_banned) return true;
    const email = this.targetEmailValue().trim().toLowerCase();
    if (!email) return false;
    return this.blacklistItems().some((item) => item.email.toLowerCase() === email);
  });

  isTargetUserSuspended = computed(() => {
    const user = this.selectedUser();
    if (user?.is_suspended) return true;
    const email = this.targetEmailValue().trim().toLowerCase();
    if (!email) return false;
    return this.suspensionItems().some((item) => item.email?.toLowerCase() === email);
  });

  filteredActiveUsers = computed(() => {
    const term = this.userSearchFilter().trim().toLowerCase();
    const users = this.activeUsers();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        (u.athlete_handle && u.athlete_handle.toLowerCase().includes(term))
    );
  });

  // Edit / Delete / Unsuspend modals
  selectedItemForEdit = signal<EmailBlacklistItem | null>(null);
  editReason = '';
  selectedItemForDelete = signal<EmailBlacklistItem | null>(null);
  selectedSuspensionForUnsuspend = signal<ActiveSuspensionItem | null>(null);

  // Pagination totals computed
  totalBlacklistPages = computed(() => Math.max(1, Math.ceil(this.totalBlacklist() / this.limitBlacklist())));
  totalSuspensionsPages = computed(() => Math.max(1, Math.ceil(this.totalSuspensions() / this.limitSuspensions())));
  totalGlobalPages = computed(() => Math.max(1, Math.ceil(this.totalGlobal() / this.limitGlobal())));

  ngOnInit(): void {
    this.loadCurrentTab();
  }

  setTab(tab: SanctionsTab): void {
    this.activeTab.set(tab);
    this.loadCurrentTab();
  }

  reloadCurrentTab(): void {
    this.loadCurrentTab(true);
  }

  loadCurrentTab(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    if (this.activeTab() === 'vetos') {
      this.usersApi
        .getBlacklist({
          search: this.searchBlacklist() || undefined,
          page: this.pageBlacklist(),
          limit: this.limitBlacklist(),
        })
        .subscribe({
          next: (res) => {
            this.blacklistItems.set(res.result || []);
            this.totalBlacklist.set(res.total || 0);
            this.loading.set(false);
            this.refreshing.set(false);
          },
          error: () => {
            this.showFeedback('Error al cargar la lista negra.', 'error');
            this.loading.set(false);
            this.refreshing.set(false);
          },
        });
    } else if (this.activeTab() === 'suspensiones') {
      this.usersApi
        .getActiveSuspensions({
          search: this.searchSuspensions() || undefined,
          page: this.pageSuspensions(),
          limit: this.limitSuspensions(),
        })
        .subscribe({
          next: (res) => {
            this.suspensionItems.set(res.result?.items || []);
            this.totalSuspensions.set(res.result?.total || 0);
            this.loading.set(false);
            this.refreshing.set(false);
          },
          error: () => {
            this.showFeedback('Error al cargar suspensiones activas.', 'error');
            this.loading.set(false);
            this.refreshing.set(false);
          },
        });
    } else if (this.activeTab() === 'historial') {
      this.usersApi
        .getGlobalSanctions({
          action_type: this.filterActionType(),
          category: this.filterCategory(),
          search: this.searchGlobal() || undefined,
          page: this.pageGlobal(),
          limit: this.limitGlobal(),
        })
        .subscribe({
          next: (res) => {
            this.globalItems.set(res.result?.items || []);
            this.totalGlobal.set(res.result?.total || 0);
            this.loading.set(false);
            this.refreshing.set(false);
          },
          error: () => {
            this.showFeedback('Error al cargar el historial global de sanciones.', 'error');
            this.loading.set(false);
            this.refreshing.set(false);
          },
        });
    }
  }

  // --- Users catalog selector methods ---
  loadActiveUsers(): void {
    if (this.activeUsers().length > 0) return;
    this.loadingActiveUsers.set(true);
    this.usersApi.getCatalog({ limit: 100 }).subscribe({
      next: (res) => {
        this.activeUsers.set(res.items || []);
        this.loadingActiveUsers.set(false);
        if (this.targetEmail.trim()) {
          const clean = this.targetEmail.trim().toLowerCase();
          const matched = (res.items || []).find(u => u.email.toLowerCase() === clean);
          if (matched) {
            this.selectedUser.set(matched);
          }
        }
      },
      error: () => {
        this.loadingActiveUsers.set(false);
      },
    });
  }

  selectUser(u: AdminUserCatalogItem): void {
    if (this.selectedUser()?.id === u.id) {
      this.clearSelectedUser();
      return;
    }
    this.selectedUser.set(u);
    this.targetEmail = u.email;
    this.targetEmailValue.set(u.email);
    if (u.is_banned || this.blacklistItems().some(item => item.email.toLowerCase() === u.email.toLowerCase())) {
      this.selectedActionType.set('ban');
    } else if (u.is_suspended || this.suspensionItems().some(item => item.email?.toLowerCase() === u.email.toLowerCase())) {
      this.selectedActionType.set('ban');
    }
  }

  clearSelectedUser(): void {
    this.selectedUser.set(null);
    this.targetEmail = '';
    this.targetEmailValue.set('');
  }

  onEmailInputChange(val: string): void {
    this.targetEmail = val;
    this.targetEmailValue.set(val);
    const clean = val.trim().toLowerCase();
    if (!clean) {
      this.selectedUser.set(null);
      return;
    }
    const matched = this.activeUsers().find(u => u.email.toLowerCase() === clean);
    if (matched) {
      this.selectedUser.set(matched);
      if (matched.is_banned || matched.is_suspended) {
        this.selectedActionType.set('ban');
      }
    } else {
      const sel = this.selectedUser();
      if (sel && sel.email.toLowerCase() !== clean) {
        this.selectedUser.set(null);
      }
      if (this.blacklistItems().some(item => item.email.toLowerCase() === clean)) {
        this.selectedActionType.set('ban');
      } else if (this.suspensionItems().some(item => item.email?.toLowerCase() === clean)) {
        this.selectedActionType.set('ban');
      }
    }
  }

  // --- Disciplinary Action Submissions ---
  openAddModal(): void {
    this.targetEmail = '';
    this.targetEmailValue.set('');
    this.sanctionReason = '';
    this.sanctionCategory = 'conduct';
    this.suspensionDays = 7;
    this.strikePoints = 1;
    this.strikeExpirationDays = 30;
    this.userSearchFilter.set('');
    this.selectedUser.set(null);
    this.showAddModal.set(true);
    this.loadActiveUsers();
  }

  submitDisciplinaryAction(): void {
    const email = this.targetEmail.trim();
    const reason = this.sanctionReason.trim();
    if (!email) {
      this.showFeedback('Debes ingresar un correo electrónico.', 'error');
      return;
    }
    if (reason.length < 3) {
      this.showFeedback('El motivo formal de la sanción debe tener al menos 3 caracteres.', 'error');
      return;
    }

    if (this.isTargetUserBanned()) {
      this.showFeedback('El usuario ya se encuentra vetado en la Lista Negra. No es posible aplicarle sanciones.', 'error');
      return;
    }

    if (this.isTargetUserSuspended() && this.selectedActionType() !== 'ban') {
      this.showFeedback('El usuario actualmente se encuentra suspendido. Para usuarios suspendidos únicamente se permite la opción de baneo.', 'error');
      return;
    }

    this.submitting.set(true);
    const action = this.selectedActionType();
    let user = this.selectedUser();
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      user = this.activeUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      if (user) {
        this.selectedUser.set(user);
      }
    }

    if (!user && action !== 'ban') {
      this.usersApi.getCatalog({ search: email, limit: 10 }).subscribe({
        next: (res) => {
          const found = (res.items || []).find(u => u.email.toLowerCase() === email.toLowerCase());
          if (found) {
            this.selectedUser.set(found);
            this.executeDisciplinarySubmission(action, email, reason, found.id);
          } else {
            this.submitting.set(false);
            this.showFeedback(`No se encontró ningún usuario registrado con el correo ${email}.`, 'error');
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.showFeedback(this.extractApiErrorMessage(err, 'Error al buscar el usuario.'), 'error');
        },
      });
      return;
    }

    this.executeDisciplinarySubmission(action, email, reason, user?.id || null);
  }

  private executeDisciplinarySubmission(action: string, email: string, reason: string, userId: number | null): void {
    if (action === 'ban') {
      if (userId) {
        this.usersApi.banUser(userId, { reason }).subscribe({
          next: () => this.handleActionSuccess(`Veto permanente aplicado con éxito a ${email}.`),
          error: (err) => this.handleActionError(err, 'Error al aplicar veto permanente.'),
        });
      } else {
        const payload: EmailBlacklistCreatePayload = { email, reason };
        this.usersApi.addBlacklist(payload).subscribe({
          next: () => this.handleActionSuccess(`Correo ${email} agregado a la lista negra.`),
          error: (err) => this.handleActionError(err, 'Error al agregar a la lista negra.'),
        });
      }
    } else if (action === 'suspension') {
      if (!userId) {
        this.submitting.set(false);
        this.showFeedback('Para aplicar una suspensión temporal debes seleccionar un usuario registrado.', 'error');
        return;
      }
      const days = Number(this.suspensionDays) || 7;
      const payload: SuspendUserPayload = {
        duration_days: days,
        reason,
        category: this.sanctionCategory,
      };
      this.usersApi.suspendUser(userId, payload).subscribe({
        next: () => this.handleActionSuccess(`Usuario ${email} suspendido por ${days} días con reactivación automática.`),
        error: (err) => this.handleActionError(err, 'Error al suspender usuario.'),
      });
    } else if (action === 'strike') {
      if (!userId) {
        this.submitting.set(false);
        this.showFeedback('Para registrar un strike debes seleccionar un usuario registrado.', 'error');
        return;
      }
      const points = Number(this.strikePoints) || 1;
      const payload: IssueStrikePayload = {
        reason,
        points,
        category: this.sanctionCategory,
        expires_in_days: this.strikeExpirationDays ? Number(this.strikeExpirationDays) : undefined,
      };
      this.usersApi.issueStrike(userId, payload).subscribe({
        next: (res) => this.handleActionSuccess(res.message || `Strike de ${points} punto(s) emitido con éxito.`),
        error: (err) => this.handleActionError(err, 'Error al emitir strike.'),
      });
    } else if (action === 'warning') {
      if (!userId) {
        this.submitting.set(false);
        this.showFeedback('Para emitir una advertencia debes seleccionar un usuario registrado.', 'error');
        return;
      }
      const payload: IssueWarningPayload = {
        reason,
        category: this.sanctionCategory,
      };
      this.usersApi.issueWarning(userId, payload).subscribe({
        next: () => this.handleActionSuccess(`Advertencia formal enviada por correo a ${email}.`),
        error: (err) => this.handleActionError(err, 'Error al emitir advertencia.'),
      });
    }
  }

  private handleActionSuccess(msg: string): void {
    this.submitting.set(false);
    this.showAddModal.set(false);
    this.showFeedback(msg, 'success');
    this.loadCurrentTab();
  }

  private extractApiErrorMessage(err: any, fallback: string): string {
    if (err?.error?.error?.message) {
      return err.error.error.message;
    }
    if (err?.error?.message) {
      return err.error.message;
    }
    if (typeof err?.error?.detail === 'string') {
      return err.error.detail;
    }
    if (Array.isArray(err?.error?.detail) && err.error.detail[0]?.msg) {
      return err.error.detail[0].msg;
    }
    if (err?.error?.error?.details?.errors?.[0]?.msg) {
      return err.error.error.details.errors[0].msg;
    }
    return fallback;
  }

  private handleActionError(err: any, fallback: string): void {
    this.submitting.set(false);
    const msg = this.extractApiErrorMessage(err, fallback);
    this.showFeedback(msg, 'error');
  }

  // --- Appeal modal methods ---
  getAppealItemFullName(item: EmailBlacklistItem | GlobalSanctionItem): string | null {
    if ('full_name' in item && item.full_name) {
      return item.full_name;
    }
    return null;
  }

  openAppealModal(item: EmailBlacklistItem | GlobalSanctionItem): void {
    this.appealItem.set(item);
    this.appealReason = '';
    this.appealResetStrikes = true;
  }

  openUnsuspendModalFromGlobal(item: GlobalSanctionItem): void {
    let daysRemaining = item.days_remaining ?? 0;
    if (daysRemaining <= 0 && item.expires_at) {
      const exp = new Date(item.expires_at).getTime();
      const now = Date.now();
      daysRemaining = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
    }
    this.selectedSuspensionForUnsuspend.set({
      id: item.id,
      user_id: item.user_id,
      email: item.email,
      full_name: item.full_name,
      handle: item.handle,
      avatar_url: item.avatar_url,
      reason: item.reason,
      category: item.category,
      duration_days: item.duration_days ?? null,
      days_remaining: daysRemaining,
      starts_at: item.created_at,
      expires_at: item.expires_at,
      created_by: item.created_by,
      created_by_name: item.created_by_name,
    });
  }

  openAppealStrikeModal(item: GlobalSanctionItem): void {
    this.appealStrikeItem.set(item);
    this.appealStrikeReason = '';
  }

  submitAppealStrike(): void {
    const item = this.appealStrikeItem();
    if (!item || !this.appealStrikeReason.trim()) return;

    this.submitting.set(true);
    const payload: AppealStrikePayload = {
      resolution_reason: this.appealStrikeReason.trim(),
    };

    this.usersApi.appealStrike(item.id, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        const email = item.email;
        this.appealStrikeItem.set(null);
        this.showFeedback(res.message || `Strike anulado con éxito para ${email}.`, 'success');
        this.loadCurrentTab();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = this.extractApiErrorMessage(err, 'Error al procesar la apelación del strike.');
        this.showFeedback(msg, 'error');
      },
    });
  }

  submitAppeal(): void {
    const item = this.appealItem();
    if (!item || !this.appealReason.trim()) return;

    this.submitting.set(true);
    const payload: AppealBanPayload = {
      resolution_reason: this.appealReason.trim(),
      reset_strikes: this.appealResetStrikes,
    };

    const req$ = item.user_id
      ? this.usersApi.appealBanUser(item.user_id, payload)
      : this.usersApi.appealBlacklist(item.id, payload);

    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        const email = item.email;
        this.appealItem.set(null);
        this.showFeedback(`Apelación aprobada con éxito para ${email}. Acceso y cuenta rehabilitados.`, 'success');
        this.loadCurrentTab();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = this.extractApiErrorMessage(err, 'Error al procesar la apelación.');
        this.showFeedback(msg, 'error');
      },
    });
  }

  // --- Unsuspend modal ---
  openUnsuspendModal(item: ActiveSuspensionItem): void {
    this.selectedSuspensionForUnsuspend.set(item);
  }

  submitUnsuspend(): void {
    const sus = this.selectedSuspensionForUnsuspend();
    if (!sus) return;

    this.submitting.set(true);
    this.usersApi.unsuspendUser(sus.user_id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedSuspensionForUnsuspend.set(null);
        this.showFeedback(`Suspensión levantada y cuenta de ${sus.email} rehabilitada con éxito.`, 'success');
        this.loadCurrentTab();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = this.extractApiErrorMessage(err, 'Error al levantar suspensión.');
        this.showFeedback(msg, 'error');
      },
    });
  }

  // --- Blacklist Edit & Delete ---
  openEditBlacklistModal(item: EmailBlacklistItem): void {
    this.selectedItemForEdit.set(item);
    this.editReason = item.reason || '';
  }

  submitEditBlacklist(): void {
    const item = this.selectedItemForEdit();
    if (!item) return;
    this.submitting.set(true);

    const payload: EmailBlacklistUpdatePayload = {
      reason: this.editReason.trim() || null,
    };

    this.usersApi.updateBlacklist(item.id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedItemForEdit.set(null);
        this.showFeedback('Motivo de veto actualizado.', 'success');
        this.loadCurrentTab();
      },
      error: () => {
        this.submitting.set(false);
        this.showFeedback('Error al actualizar motivo.', 'error');
      },
    });
  }

  openDeleteBlacklistModal(item: EmailBlacklistItem): void {
    this.selectedItemForDelete.set(item);
  }

  submitDeleteBlacklist(): void {
    const item = this.selectedItemForDelete();
    if (!item) return;
    this.submitting.set(true);

    this.usersApi.deleteBlacklist(item.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedItemForDelete.set(null);
        this.showFeedback(`Correo ${item.email} removido de la lista negra.`, 'success');
        this.loadCurrentTab();
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 404) {
          this.selectedItemForDelete.set(null);
          this.showFeedback(`El correo ${item.email} ya no figura en la lista negra.`, 'success');
          this.loadCurrentTab();
          return;
        }
        const msg = err.error?.message || err.error?.detail || 'Error al remover correo de lista negra.';
        this.showFeedback(msg, 'error');
      },
    });
  }

  // Search & Pagination handlers for Tab 1
  onSearchBlacklistInput(val: string): void {
    this.searchBlacklist.set(val);
    this.pageBlacklist.set(1);
    this.loadCurrentTab();
  }

  clearSearchBlacklist(): void {
    this.searchBlacklist.set('');
    this.pageBlacklist.set(1);
    this.loadCurrentTab();
  }

  changeBlacklistPage(p: number): void {
    this.pageBlacklist.set(p);
    this.loadCurrentTab();
  }

  // Search & Pagination handlers for Tab 2
  onSearchSuspensionsInput(val: string): void {
    this.searchSuspensions.set(val);
    this.pageSuspensions.set(1);
    this.loadCurrentTab();
  }

  clearSearchSuspensions(): void {
    this.searchSuspensions.set('');
    this.pageSuspensions.set(1);
    this.loadCurrentTab();
  }

  changeSuspensionsPage(p: number): void {
    this.pageSuspensions.set(p);
    this.loadCurrentTab();
  }

  // Search & Pagination handlers for Tab 3
  onSearchGlobalInput(val: string): void {
    this.searchGlobal.set(val);
    this.pageGlobal.set(1);
    this.loadCurrentTab();
  }

  clearSearchGlobal(): void {
    this.searchGlobal.set('');
    this.pageGlobal.set(1);
    this.loadCurrentTab();
  }

  onFilterActionTypeChange(val: string): void {
    this.filterActionType.set(val);
    this.pageGlobal.set(1);
    this.loadCurrentTab();
  }

  onFilterCategoryChange(val: string): void {
    this.filterCategory.set(val);
    this.pageGlobal.set(1);
    this.loadCurrentTab();
  }

  changeGlobalPage(p: number): void {
    this.pageGlobal.set(p);
    this.loadCurrentTab();
  }

  private showFeedback(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => {
      this.feedbackMessage.set(null);
    }, 5000);
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}

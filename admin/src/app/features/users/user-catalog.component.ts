import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersApiService } from '../../core/services/users-api.service';
import {
  AdminGoalSummary,
  AdminUserCatalogItem,
  AdminUserCatalogResponse,
  AppealBanPayload,
  AppealStrikePayload,
  BMS_ROLES,
  DisciplinarySanctionItem,
  IssueWarningPayload,
  SuspendUserPayload,
  UserSanctionsSummary,
} from '../../core/models/user.model';

@Component({
  selector: 'app-user-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <!-- Section header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-violet-600"></span>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Directorio</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Catálogo de Usuarios</h2>
          <p class="mt-1 text-sm text-slate-500">
            Filtra y ordena por cada columna: estado, nombre, roles, metas activas, recaudación y fecha de registro.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Total / Filtered count -->
          @if (!initialLoading()) {
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              @if (hasActiveFilters()) {
                {{ totalFiltered() }} de {{ rawUsers().length }} usuarios
              } @else {
                {{ rawUsers().length }} usuarios
              }
            </span>
          }

          <!-- Single Clear Filters Button -->
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-rose-100 hover:text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400/20 cursor-pointer animate-fade-in"
              title="Eliminar todos los filtros y volver a la vista original"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span>Limpiar filtros</span>
            </button>
          }

          <!-- Reload button -->
          <button
            type="button"
            (click)="reload()"
            [disabled]="refreshing()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
            title="Sincronizar con el servidor"
          >
            <svg class="h-3.5 w-3.5" [class.animate-spin]="refreshing()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <!-- Search & Active Filter Chips -->
      <div class="mb-5 space-y-2.5">
        <!-- Search Input (Instant Real-time Filter) -->
        <div class="relative max-w-md">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            [ngModel]="search()"
            (ngModelChange)="onSearchInput($event)"
            placeholder="Buscar por nombre, correo o handle..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-9 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          @if (search()) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Limpiar texto"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </button>
          }
        </div>

        <!-- Active Filter Tags (without redundant "Borrar todos" link) -->
        @if (hasActiveFilters()) {
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <span class="text-[11px] font-semibold text-slate-400">Filtros aplicados:</span>

            @if (search()) {
              <span class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                Texto: "{{ search() }}"
                <button type="button" (click)="clearSearch()" class="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">×</button>
              </span>
            }

            @if (selectedStatus() !== 'all') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Estado: {{ getStatusLabel(selectedStatus()) }}
                <button type="button" (click)="setStatus('all')" class="text-emerald-500 hover:text-emerald-800 cursor-pointer font-bold">×</button>
              </span>
            }

            @if (selectedRole() !== 'all') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                Rol: {{ getRoleLabel(selectedRole()) }}
                <button type="button" (click)="setRole('all')" class="text-violet-500 hover:text-violet-800 cursor-pointer font-bold">×</button>
              </span>
            }

            @if (selectedGoals() !== 'all') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                Metas: {{ selectedGoals() === 'with_goals' ? 'Con metas activas' : 'Sin metas activas' }}
                <button type="button" (click)="setGoals('all')" class="text-indigo-500 hover:text-indigo-800 cursor-pointer font-bold">×</button>
              </span>
            }

            @if (selectedRevenue() !== 'all') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Recaudado: {{ getRevenueLabel(selectedRevenue()) }}
                <button type="button" (click)="setRevenue('all')" class="text-amber-500 hover:text-amber-800 cursor-pointer font-bold">×</button>
              </span>
            }

            @if (sortBy() === 'name') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                Orden: Usuario {{ sortOrder() === 'asc' ? '(A - Z)' : '(Z - A)' }}
                <button type="button" (click)="setSort('created_at', 'desc')" class="text-blue-500 hover:text-blue-800 cursor-pointer font-bold">×</button>
              </span>
            } @else if (sortBy() === 'created_at' && sortOrder() === 'asc') {
              <span class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                Orden: Registro (Antiguo - Reciente)
                <button type="button" (click)="setSort('created_at', 'desc')" class="text-blue-500 hover:text-blue-800 cursor-pointer font-bold">×</button>
              </span>
            }
          </div>
        }
      </div>

      <!-- Initial Loading Skeleton (only on very first load) -->
      @if (initialLoading()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p class="mt-4 text-sm font-medium text-slate-500">Cargando catálogo de usuarios...</p>
        </div>
      } @else if (error() && rawUsers().length === 0) {
        <!-- Error State -->
        <div class="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center text-red-600">
          <p class="font-semibold">Error al obtener usuarios</p>
          <p class="mt-1 text-xs text-red-500">{{ error() }}</p>
          <button
            type="button"
            (click)="reload()"
            class="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      } @else {
        <!-- Users Table Container (Never unmounts, instant reactive updates) -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-opacity duration-200 min-h-[360px]">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 select-none">
              <tr>
                <!-- 1. ESTADO (a la izquierda de Usuario) -->
                <th class="relative px-4 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="selectedStatus() !== 'all'">Estado</span>
                    <button
                      type="button"
                      (click)="toggleMenu('status', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="selectedStatus() !== 'all'"
                      [class.bg-blue-50]="selectedStatus() !== 'all'"
                      title="Filtrar por estado activo/inactivo"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <!-- Status Dropdown Menu -->
                  @if (activeMenu() === 'status') {
                    <div class="absolute left-3 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      <button
                        type="button"
                        (click)="setStatus('all')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedStatus() === 'all'"
                        [class.font-semibold]="selectedStatus() === 'all'"
                      >
                        <span>Todos</span>
                        @if (selectedStatus() === 'all') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setStatus('active')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedStatus() === 'active'"
                        [class.font-semibold]="selectedStatus() === 'active'"
                      >
                        <span class="flex items-center gap-1.5">
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Solo Activos
                        </span>
                        @if (selectedStatus() === 'active') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setStatus('suspended')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedStatus() === 'suspended'"
                        [class.font-semibold]="selectedStatus() === 'suspended'"
                      >
                        <span class="flex items-center gap-1.5">
                          <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          Solo Suspendidos
                        </span>
                        @if (selectedStatus() === 'suspended') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setStatus('banned')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedStatus() === 'banned'"
                        [class.font-semibold]="selectedStatus() === 'banned'"
                      >
                        <span class="flex items-center gap-1.5">
                          <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          Solo Vetados
                        </span>
                        @if (selectedStatus() === 'banned') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setStatus('inactive')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedStatus() === 'inactive'"
                        [class.font-semibold]="selectedStatus() === 'inactive'"
                      >
                        <span class="flex items-center gap-1.5">
                          <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Solo Inactivos
                        </span>
                        @if (selectedStatus() === 'inactive') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                    </div>
                  }
                </th>

                <!-- 2. USUARIO (Orden A-Z / Z-A) -->
                <th class="relative px-5 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="sortBy() === 'name'">Usuario</span>
                    <button
                      type="button"
                      (click)="toggleMenu('user', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="sortBy() === 'name'"
                      [class.bg-blue-50]="sortBy() === 'name'"
                      title="Ordenar alfabéticamente A-Z o Z-A"
                    >
                      @if (sortBy() === 'name' && sortOrder() === 'asc') {
                        <span class="text-[10px] font-extrabold text-blue-600">A→Z</span>
                      } @else if (sortBy() === 'name' && sortOrder() === 'desc') {
                        <span class="text-[10px] font-extrabold text-blue-600">Z→A</span>
                      } @else {
                        <svg class="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      }
                    </button>
                  </div>

                  <!-- User Sort Menu -->
                  @if (activeMenu() === 'user') {
                    <div class="absolute left-4 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      <button
                        type="button"
                        (click)="setSort('name', 'asc')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="sortBy() === 'name' && sortOrder() === 'asc'"
                        [class.font-semibold]="sortBy() === 'name' && sortOrder() === 'asc'"
                      >
                        <span>A - Z (Ascendente)</span>
                        @if (sortBy() === 'name' && sortOrder() === 'asc') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setSort('name', 'desc')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="sortBy() === 'name' && sortOrder() === 'desc'"
                        [class.font-semibold]="sortBy() === 'name' && sortOrder() === 'desc'"
                      >
                        <span>Z - A (Descendente)</span>
                        @if (sortBy() === 'name' && sortOrder() === 'desc') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                    </div>
                  }
                </th>

                <!-- 3. ROLES (Filtro por roles) -->
                <th class="relative px-4 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="selectedRole() !== 'all'">Roles</span>
                    <button
                      type="button"
                      (click)="toggleMenu('role', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="selectedRole() !== 'all'"
                      [class.bg-blue-50]="selectedRole() !== 'all'"
                      title="Filtrar por rol: Todos, Atletas, Supporters, Admins"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <!-- Role Menu -->
                  @if (activeMenu() === 'role') {
                    <div class="absolute left-3 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      @for (roleOption of roleOptions; track roleOption.key) {
                        <button
                          type="button"
                          (click)="setRole(roleOption.key)"
                          class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                          [class.bg-blue-50]="selectedRole() === roleOption.key"
                          [class.font-semibold]="selectedRole() === roleOption.key"
                        >
                          <span>{{ roleOption.label }}</span>
                          @if (selectedRole() === roleOption.key) { <span class="text-blue-600 font-bold">✓</span> }
                        </button>
                      }
                    </div>
                  }
                </th>

                <!-- 4. METAS ACTIVAS (Con/Sin metas) -->
                <th class="relative px-4 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="selectedGoals() !== 'all'">Metas Activas</span>
                    <button
                      type="button"
                      (click)="toggleMenu('goals', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="selectedGoals() !== 'all'"
                      [class.bg-blue-50]="selectedGoals() !== 'all'"
                      title="Filtrar por metas activas"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <!-- Goals Menu -->
                  @if (activeMenu() === 'goals') {
                    <div class="absolute left-3 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      <button
                        type="button"
                        (click)="setGoals('all')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedGoals() === 'all'"
                        [class.font-semibold]="selectedGoals() === 'all'"
                      >
                        <span>Todas las metas</span>
                        @if (selectedGoals() === 'all') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setGoals('with_goals')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedGoals() === 'with_goals'"
                        [class.font-semibold]="selectedGoals() === 'with_goals'"
                      >
                        <span>Con metas activas</span>
                        @if (selectedGoals() === 'with_goals') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setGoals('without_goals')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedGoals() === 'without_goals'"
                        [class.font-semibold]="selectedGoals() === 'without_goals'"
                      >
                        <span>Sin metas activas</span>
                        @if (selectedGoals() === 'without_goals') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                    </div>
                  }
                </th>

                <!-- 5. RECAUDADO (Con/Sin/No aplica) -->
                <th class="relative px-4 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="selectedRevenue() !== 'all'">Recaudado</span>
                    <button
                      type="button"
                      (click)="toggleMenu('revenue', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="selectedRevenue() !== 'all'"
                      [class.bg-blue-50]="selectedRevenue() !== 'all'"
                      title="Filtrar por recaudación"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <!-- Revenue Menu -->
                  @if (activeMenu() === 'revenue') {
                    <div class="absolute left-3 top-11 z-30 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      <button
                        type="button"
                        (click)="setRevenue('all')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedRevenue() === 'all'"
                        [class.font-semibold]="selectedRevenue() === 'all'"
                      >
                        <span>Todos los montos</span>
                        @if (selectedRevenue() === 'all') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setRevenue('with_revenue')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedRevenue() === 'with_revenue'"
                        [class.font-semibold]="selectedRevenue() === 'with_revenue'"
                      >
                        <span>Con recaudación (> $0)</span>
                        @if (selectedRevenue() === 'with_revenue') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setRevenue('no_revenue')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedRevenue() === 'no_revenue'"
                        [class.font-semibold]="selectedRevenue() === 'no_revenue'"
                      >
                        <span>Sin recaudación ($0)</span>
                        @if (selectedRevenue() === 'no_revenue') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setRevenue('na')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="selectedRevenue() === 'na'"
                        [class.font-semibold]="selectedRevenue() === 'na'"
                      >
                        <span>No aplica (--)</span>
                        @if (selectedRevenue() === 'na') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                    </div>
                  }
                </th>

                <!-- 6. REGISTRO (Reciente-Antiguo / Antiguo-Reciente) -->
                <th class="relative hidden px-4 py-3.5 md:table-cell">
                  <div class="flex items-center gap-1.5">
                    <span [class.text-blue-600]="sortBy() === 'created_at'">Registro</span>
                    <button
                      type="button"
                      (click)="toggleMenu('date', $event)"
                      class="rounded-md p-1 hover:bg-slate-200/60 transition cursor-pointer"
                      [class.text-blue-600]="sortBy() === 'created_at'"
                      [class.bg-blue-50]="sortBy() === 'created_at'"
                      title="Ordenar por fecha de registro"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                      </svg>
                    </button>
                  </div>

                  <!-- Date Sort Menu -->
                  @if (activeMenu() === 'date') {
                    <div class="absolute left-3 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
                      <button
                        type="button"
                        (click)="setSort('created_at', 'desc')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="sortBy() === 'created_at' && sortOrder() === 'desc'"
                        [class.font-semibold]="sortBy() === 'created_at' && sortOrder() === 'desc'"
                      >
                        <span>Reciente - Antiguo</span>
                        @if (sortBy() === 'created_at' && sortOrder() === 'desc') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                      <button
                        type="button"
                        (click)="setSort('created_at', 'asc')"
                        class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-between"
                        [class.bg-blue-50]="sortBy() === 'created_at' && sortOrder() === 'asc'"
                        [class.font-semibold]="sortBy() === 'created_at' && sortOrder() === 'asc'"
                      >
                        <span>Antiguo - Reciente</span>
                        @if (sortBy() === 'created_at' && sortOrder() === 'asc') { <span class="text-blue-600 font-bold">✓</span> }
                      </button>
                    </div>
                  }
                </th>

                <!-- 7. ACCIONES -->
                <th class="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100 bg-white">
              @if (pagedUsers().length === 0) {
                <tr>
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    <p class="text-sm font-medium">No hay usuarios que coincidan con los filtros seleccionados.</p>
                    <button
                      type="button"
                      (click)="resetFilters()"
                      class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              } @else {
                @for (user of pagedUsers(); track user.id) {
                  <tr class="transition-colors hover:bg-slate-50/80">
                    <!-- Columna ESTADO (a la izquierda de Usuario) -->
                    <td class="px-4 py-4 whitespace-nowrap">
                      @if (user.is_banned) {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          Vetado
                        </span>
                      } @else if (user.is_suspended) {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          Suspendido
                        </span>
                      } @else if (user.is_active) {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                          <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Inactivo
                        </span>
                      }
                    </td>

                    <!-- Columna USUARIO -->
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-sm"
                             [class.bg-violet-600]="user.roles.includes('athlete')"
                             [class.bg-emerald-600]="user.roles.includes('supporter') && !user.roles.includes('athlete')"
                             [class.bg-blue-600]="user.roles.includes('admin') && !user.roles.includes('athlete')">
                          @if (user.avatar_url) {
                            <img [src]="user.avatar_url" [alt]="user.full_name" class="h-full w-full object-cover" />
                          } @else {
                            <span>{{ (user.full_name?.[0] || user.email?.[0] || '?') | uppercase }}</span>
                          }
                        </div>

                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5">
                            <span class="font-semibold text-slate-900 truncate">{{ user.full_name }}</span>
                            @if (user.is_verified_athlete) {
                              <span class="text-blue-500 shrink-0" title="Atleta verificado">
                                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                </svg>
                              </span>
                            }
                          </div>
                          <p class="text-xs text-slate-500 truncate">{{ user.email }}</p>
                          @if (user.athlete_handle) {
                            <span class="inline-block text-[11px] font-medium text-violet-600">
                              {{ '@' + user.athlete_handle }}
                            </span>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Columna ROLES -->
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="flex flex-wrap gap-1">
                        @for (role of user.roles; track role) {
                          @if (role === 'athlete') {
                            <span class="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              Atleta
                            </span>
                          } @else if (role === 'supporter') {
                            <span class="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Supporter
                            </span>
                          } @else if (role === 'admin') {
                            <span class="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Admin
                            </span>
                          } @else {
                            <span class="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {{ role }}
                            </span>
                          }
                        }
                        @if (user.roles.length === 0) {
                          <span class="text-xs text-slate-400">Sin roles</span>
                        }
                      </div>
                    </td>

                    <!-- Columna METAS ACTIVAS -->
                    <td class="px-4 py-4 min-w-[200px]">
                      @if (user.active_goals.length > 0) {
                        <div class="space-y-1.5">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-medium text-slate-800 truncate max-w-[140px]" [title]="user.active_goals[0].title">
                              {{ user.active_goals[0].title }}
                            </span>
                            <span class="font-bold text-violet-700 shrink-0">
                              {{ user.active_goals[0].progress_pct }}%
                            </span>
                          </div>

                          <!-- Progress Bar -->
                          <div class="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-300"
                              [style.width.%]="mathMin(user.active_goals[0].progress_pct, 100)"
                            ></div>
                          </div>

                          <div class="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              \${{ user.active_goals[0].raised_amount | number: '1.2-2' }} / \${{ user.active_goals[0].target_amount | number: '1.2-2' }} {{ user.active_goals[0].currency }}
                            </span>
                            @if (user.active_goals.length > 1) {
                              <button
                                type="button"
                                (click)="openUserGoalsModal(user)"
                                class="text-[11px] font-semibold text-violet-600 hover:text-violet-800 underline cursor-pointer"
                              >
                                +{{ user.active_goals.length - 1 }} más
                              </button>
                            }
                          </div>
                        </div>
                      } @else if (user.roles.includes('athlete')) {
                        <div class="flex items-center gap-1.5 text-xs text-slate-400">
                          <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          <span>Sin metas activas</span>
                        </div>
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>

                    <!-- Columna RECAUDADO -->
                    <td class="px-4 py-4 whitespace-nowrap">
                      @if (user.roles.includes('athlete')) {
                        <div>
                          <div class="text-sm font-extrabold text-slate-900">
                            \${{ user.financials.total_raised | number: '1.2-2' }}
                            <span class="text-xs font-semibold text-slate-500">{{ user.financials.currency }}</span>
                          </div>
                          <div class="text-[11px] text-slate-500">
                            @if (user.financials.total_shakes_count > 0) {
                              <span>{{ user.financials.total_shakes_count }} shakes recibidos</span>
                            } @else if (user.financials.successful_tx_count > 0) {
                              <span>{{ user.financials.successful_tx_count }} pagos recibidos</span>
                            } @else {
                              <span>Sin recaudación aún</span>
                            }
                          </div>
                        </div>
                      } @else if (user.roles.includes('supporter') && user.financials.total_contributed > 0) {
                        <div>
                          <div class="text-xs font-semibold text-emerald-700">
                            \${{ user.financials.total_contributed | number: '1.2-2' }} USD
                          </div>
                          <span class="text-[10px] text-slate-400">Aportados como supporter</span>
                        </div>
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>

                    <!-- Columna REGISTRO -->
                    <td class="hidden px-4 py-4 whitespace-nowrap text-xs text-slate-500 md:table-cell">
                      {{ user.created_at ? (user.created_at | date: 'dd/MM/yyyy') : '—' }}
                    </td>

                    <!-- Columna ACCIONES -->
                    <td class="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        (click)="openUserGoalsModal(user)"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                      >
                        <svg class="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        @if (totalFiltered() > 0) {
          <div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div class="text-xs text-slate-500">
              Mostrando
              <strong class="text-slate-800">{{ ((currentPage() - 1) * limit()) + 1 }}</strong>
              a
              <strong class="text-slate-800">{{ mathMin(currentPage() * limit(), totalFiltered()) }}</strong>
              de
              <strong class="text-slate-800">{{ totalFiltered() | number }}</strong>
              usuarios
            </div>

            <div class="flex items-center gap-2">
              <!-- Limit selector -->
              <select
                [ngModel]="limit()"
                (ngModelChange)="onLimitChange($event)"
                class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option [value]="10">10 por pág.</option>
                <option [value]="20">20 por pág.</option>
                <option [value]="50">50 por pág.</option>
              </select>

              <!-- Page Buttons -->
              <button
                type="button"
                [disabled]="currentPage() <= 1"
                (click)="changePage(currentPage() - 1)"
                class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>

              <span class="px-2 text-xs font-semibold text-slate-600">
                Página {{ currentPage() }} de {{ totalPages() }}
              </span>

              <button
                type="button"
                [disabled]="currentPage() >= totalPages()"
                (click)="changePage(currentPage() + 1)"
                class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      }
    </div>

    <!-- User Goals & Details Modal -->
    @if (modalUser(); as user) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div class="flex items-center gap-3.5">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-lg font-bold text-white shadow-sm">
                @if (user.avatar_url) {
                  <img [src]="user.avatar_url" [alt]="user.full_name" class="h-full w-full object-cover rounded-2xl" />
                } @else {
                  <span>{{ (user.full_name?.[0] || user.email?.[0] || '?') | uppercase }}</span>
                }
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-bold text-slate-900">{{ user.full_name }}</h3>
                  @if (user.is_verified_athlete) {
                    <span class="text-blue-500" title="Atleta verificado">
                      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </span>
                  }
                  @if (userSanctionsSummary()?.is_banned || userSanctionsSummary()?.is_blacklisted || user.is_banned) {
                    <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Vetado / Lista Negra
                    </span>
                  } @else if (userSanctionsSummary()?.is_suspended || user.is_suspended) {
                    <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Suspendido Temporalmente
                    </span>
                  } @else if (user.is_active) {
                    <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Activo
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Inactivo
                    </span>
                  }
                </div>
                <p class="text-xs text-slate-500">
                  {{ user.email }}
                  @if (user.athlete_handle) {
                    <span class="text-violet-600 font-semibold"> · @{{ user.athlete_handle }}</span>
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="closeModal()"
              class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Recaudado</p>
                <p class="mt-1 text-xl font-extrabold text-slate-900">
                  \${{ user.financials.total_raised | number: '1.2-2' }}
                  <span class="text-xs font-semibold text-slate-500">{{ user.financials.currency }}</span>
                </p>
                <p class="mt-0.5 text-[11px] text-slate-500">Pagos exitosos confirmados</p>
              </div>

              <div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Shakes Recibidos</p>
                <p class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ user.financials.total_shakes_count | number }}
                </p>
                <p class="mt-0.5 text-[11px] text-slate-500">En {{ user.financials.successful_tx_count }} transacciones</p>
              </div>

              <div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Metas Activas</p>
                <p class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ user.active_goals.length }}
                  <span class="text-xs font-normal text-slate-400">de {{ user.total_goals_count }} totales</span>
                </p>
                <p class="mt-0.5 text-[11px] text-slate-500">Actualmente en campaña</p>
              </div>
            </div>

            <!-- Active Goals Section -->
            <div>
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-violet-600"></span>
                  <h4 class="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Metas Deportivas Activas
                  </h4>
                </div>
                <span class="text-xs font-semibold text-slate-500">
                  {{ user.active_goals.length }} activa(s)
                </span>
              </div>

              @if (user.active_goals.length === 0) {
                <div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <p class="text-sm font-medium text-slate-600">Este usuario no tiene metas deportivas activas actualmente.</p>
                  @if (!user.roles.includes('athlete')) {
                    <p class="mt-1 text-xs text-slate-400">Las metas están disponibles exclusivamente para usuarios con rol de Atleta.</p>
                  }
                </div>
              } @else {
                <div class="space-y-4">
                  @for (goal of user.active_goals; track goal.id) {
                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200">
                      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div class="flex items-start gap-3">
                          @if (goal.cover_image_url) {
                            <img [src]="goal.cover_image_url" [alt]="goal.title" class="h-12 w-12 rounded-xl object-cover shrink-0" />
                          } @else {
                            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                          }

                          <div>
                            <div class="flex items-center gap-2">
                              <h5 class="text-base font-bold text-slate-900">{{ goal.title }}</h5>
                              <span class="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Activa
                              </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">
                              Creada el {{ goal.created_at ? (goal.created_at | date: 'dd/MM/yyyy') : '—' }}
                            </p>
                          </div>
                        </div>

                        <div class="text-right sm:self-center">
                          <div class="text-sm font-extrabold text-violet-700">
                            {{ goal.progress_pct }}%
                          </div>
                          <div class="text-xs font-medium text-slate-600">
                            \${{ goal.raised_amount | number: '1.2-2' }}
                            <span class="text-slate-400">/ \${{ goal.target_amount | number: '1.2-2' }} {{ goal.currency }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Progress bar -->
                      <div class="mt-4 relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
                          [style.width.%]="mathMin(goal.progress_pct, 100)"
                        ></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Disciplinary Sanctions & Trust Section -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-amber-500"></span>
                  <h4 class="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Sanciones & Estado Disciplinario
                  </h4>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-wrap items-center gap-2">
                  @if (user.is_banned || userSanctionsSummary()?.is_banned || userSanctionsSummary()?.is_blacklisted) {
                    <button
                      type="button"
                      (click)="openAppealModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 cursor-pointer"
                      title="Tramitar apelación y rehabilitar usuario"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span>Apelar / Rehabilitar</span>
                    </button>
                  } @else if (user.is_suspended || userSanctionsSummary()?.is_suspended) {
                    <!-- USUARIO SUSPENDIDO: Solo Levantar Suspensión y Vetar / Banear -->
                    <button
                      type="button"
                      (click)="openUnsuspendModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 cursor-pointer"
                      title="Levantar suspensión anticipadamente y reactivar cuenta"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span>Levantar Suspensión</span>
                    </button>

                    <button
                      type="button"
                      (click)="openBanModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 shadow-sm transition hover:bg-rose-100 cursor-pointer"
                      title="Escalar suspensión a veto permanente"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
                      </svg>
                      <span>Vetar / Banear</span>
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="openWarningModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-200 cursor-pointer"
                      title="Emitir advertencia formal por correo sin corte de acceso"
                    >
                      <svg class="h-3.5 w-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                      <span>+ Advertencia</span>
                    </button>

                    <button
                      type="button"
                      (click)="openStrikeModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 cursor-pointer"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <span>+ Aplicar Strike</span>
                    </button>

                    <button
                      type="button"
                      (click)="openSuspendModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 cursor-pointer"
                      title="Suspender temporalmente por X días"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <span>Suspender</span>
                    </button>

                    <button
                      type="button"
                      (click)="openBanModal(user)"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 shadow-sm transition hover:bg-rose-100 cursor-pointer"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
                      </svg>
                      <span>Vetar / Banear</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Strike status bar -->
              @if (userSanctionsSummary(); as summary) {
                @if (summary.is_suspended && summary.active_suspension) {
                  <div class="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                    <div class="h-8 w-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="flex-1 space-y-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-extrabold text-amber-900 text-xs">Cuenta Suspendida Temporalmente</span>
                        <span class="rounded-full bg-amber-200/80 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                          {{ summary.active_suspension.days_remaining }} día(s) restante(s)
                        </span>
                      </div>
                      <p class="text-amber-800 text-[11px]">
                        <strong>Motivo:</strong> {{ summary.active_suspension.reason || 'Violación de directrices de la plataforma' }}
                      </p>
                      <div class="flex items-center justify-between text-[10px] text-amber-700 pt-0.5">
                        <span>Desde: {{ summary.active_suspension.starts_at ? (summary.active_suspension.starts_at | date: 'dd/MM/yyyy HH:mm') : '—' }}</span>
                        <span>Hasta: {{ summary.active_suspension.expires_at ? (summary.active_suspension.expires_at | date: 'dd/MM/yyyy HH:mm') : '—' }}</span>
                      </div>
                    </div>
                  </div>
                }

                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3.5 border border-slate-100 shadow-xs">
                  <div class="flex items-center gap-3">
                    <!-- Strike Pips indicator (1, 2, 3) -->
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-semibold text-slate-500 mr-1">Strikes:</span>
                      <span
                        class="h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold"
                        [class.bg-amber-400]="summary.total_strike_points >= 1"
                        [class.border-amber-500]="summary.total_strike_points >= 1"
                        [class.text-white]="summary.total_strike_points >= 1"
                        [class.bg-slate-100]="summary.total_strike_points < 1"
                        [class.border-slate-300]="summary.total_strike_points < 1"
                      >1</span>
                      <span
                        class="h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold"
                        [class.bg-amber-500]="summary.total_strike_points >= 2"
                        [class.border-amber-600]="summary.total_strike_points >= 2"
                        [class.text-white]="summary.total_strike_points >= 2"
                        [class.bg-slate-100]="summary.total_strike_points < 2"
                        [class.border-slate-300]="summary.total_strike_points < 2"
                      >2</span>
                      <span
                        class="h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold"
                        [class.bg-rose-600]="summary.total_strike_points >= 3"
                        [class.border-rose-700]="summary.total_strike_points >= 3"
                        [class.text-white]="summary.total_strike_points >= 3"
                        [class.bg-slate-100]="summary.total_strike_points < 3"
                        [class.border-slate-300]="summary.total_strike_points < 3"
                      >3</span>
                    </div>

                    <span class="text-xs font-bold" [class.text-rose-600]="summary.is_banned" [class.text-amber-700]="!summary.is_banned && summary.total_strike_points > 0" [class.text-emerald-700]="!summary.is_banned && summary.total_strike_points === 0">
                      @if (summary.is_banned) {
                        Baneado permanentemente
                      } @else if (summary.total_strike_points === 0) {
                        Cuenta limpia (0 strikes)
                      } @else {
                        {{ summary.total_strike_points }} strike(s) acumulados
                      }
                    </span>
                  </div>

                  @if (summary.is_blacklisted) {
                    <span class="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                      En Lista Negra
                    </span>
                  }
                </div>
              }

              <!-- Sanction Feedback message -->
              @if (sanctionFeedback()) {
                <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium">
                  {{ sanctionFeedback() }}
                </div>
              }

              <!-- Sanctions history table -->
              @if (loadingSanctions()) {
                <p class="text-xs text-slate-400 py-2">Consultando historial disciplinario...</p>
              } @else if (userSanctions().length === 0) {
                <p class="text-xs text-slate-400 italic">No registra sanciones ni amonestaciones previas.</p>
              } @else {
                <div class="space-y-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Historial de Sanciones</span>
                  <div class="max-h-48 overflow-y-auto space-y-1.5">
                    @for (s of userSanctions(); track s.id) {
                      <div class="rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs flex items-start justify-between gap-3">
                        <div class="space-y-0.5">
                          <div class="flex items-center gap-2">
                            @if (s.action_type === 'ban') {
                              <span class="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                                BANEO
                              </span>
                            } @else if (s.action_type === 'suspension') {
                              <span class="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                SUSPENSIÓN ({{ s.duration_days ?? 7 }}D)
                              </span>
                            } @else {
                              <span class="inline-flex items-center rounded-md bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800">
                                STRIKE (+{{ s.points }})
                              </span>
                            }
                            <span class="font-bold text-slate-800">{{ s.reason }}</span>
                          </div>
                          <p class="text-[11px] text-slate-400">
                            Categoría: {{ s.category }} · {{ s.created_at ? (s.created_at | date: 'dd/MM/yyyy HH:mm') : '—' }}
                            @if (s.action_type === 'suspension' && s.expires_at) {
                              · Vence: {{ s.expires_at | date: 'dd/MM/yyyy HH:mm' }}
                            }
                          </p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          @if (s.action_type === 'suspension' && s.is_active) {
                            <button
                              type="button"
                              (click)="openUnsuspendModal(user)"
                              class="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-xs transition"
                              title="Levantar suspensión anticipadamente"
                            >
                              Levantar
                            </button>
                          }
                          @if (s.action_type === 'strike' && s.is_active) {
                            <button
                              type="button"
                              (click)="openAppealStrikeModal(s, user)"
                              class="rounded-lg border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[10px] font-bold text-yellow-800 hover:bg-yellow-100 cursor-pointer shadow-xs transition"
                              title="Apelar y anular este strike"
                            >
                              Apelar Strike
                            </button>
                          }
                          <span class="text-[10px] font-bold" [class.text-emerald-600]="s.is_active" [class.text-slate-400]="!s.is_active">
                            {{ s.is_active ? 'Activa' : 'Inactiva' }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              (click)="closeModal()"
              class="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: APLICAR STRIKE -->
    @if (showStrikeModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Aplicar Strike Disciplinario</h3>
            </div>
            <button type="button" (click)="showStrikeModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Usuario sancionado: <strong class="text-slate-900">{{ targetUser.full_name }}</strong> ({{ targetUser.email }})
          </div>

          <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            <svg class="h-4 w-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <strong>Regla de 3 Strikes:</strong> Si el usuario acumula 3 o más puntos activos de strike, su cuenta será desactivada y su correo enviado a la lista negra automáticamente.
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Motivo de la infracción *</label>
                <span class="text-[11px] font-semibold"
                  [class.text-rose-500]="strikeReason.trim().length < 3 || strikeReason.trim().length > 500"
                  [class.text-emerald-600]="strikeReason.trim().length >= 3 && strikeReason.trim().length <= 500">
                  {{ strikeReason.trim().length }}/500
                </span>
              </div>
              <textarea
                [(ngModel)]="strikeReason"
                rows="3"
                maxlength="500"
                placeholder="Ejemplo: Publicación de contenido inapropiado o violación a las normas comunitarias (mínimo 3 caracteres)."
                class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Puntos de Strike</label>
                <select
                  [(ngModel)]="strikePoints"
                  class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option [value]="1">1 Punto (Amonestación leve)</option>
                  <option [value]="2">2 Puntos (Infracción grave)</option>
                  <option [value]="3">3 Puntos (Ban automático)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  [(ngModel)]="strikeCategory"
                  class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="conduct">Conducta / Comportamiento</option>
                  <option value="harassment">Acoso / Hostigamiento</option>
                  <option value="fraud">Fraude o Estafa</option>
                  <option value="unfulfilled_rewards">Incumplimiento de Recompensas</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showStrikeModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || strikeReason.trim().length < 3"
              (click)="submitStrike(targetUser)"
              class="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Aplicando...' : 'Aplicar Strike' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: EMITIR ADVERTENCIA -->
    @if (showWarningModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Emitir Advertencia Formal</h3>
            </div>
            <button type="button" (click)="showWarningModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Usuario: <strong class="text-slate-900">{{ targetUser.full_name }}</strong> ({{ targetUser.email }})
          </div>

          <div class="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-700">
            <svg class="h-4 w-4 shrink-0 text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <strong>Aviso formal:</strong> La advertencia no interrumpe el acceso del usuario ni acumula puntos de strike, pero queda asentada en su expediente y se le notifica por correo electrónico.
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Motivo formal de la advertencia *</label>
                <span class="text-[11px] font-semibold"
                  [class.text-rose-500]="warningReason.trim().length < 3 || warningReason.trim().length > 500"
                  [class.text-emerald-600]="warningReason.trim().length >= 3 && warningReason.trim().length <= 500">
                  {{ warningReason.trim().length }}/500
                </span>
              </div>
              <textarea
                [(ngModel)]="warningReason"
                rows="3"
                maxlength="500"
                placeholder="Indica de forma clara el comportamiento advertido (mínimo 3 caracteres)..."
                class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
              <select
                [(ngModel)]="warningCategory"
                class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-slate-500 focus:outline-none"
              >
                <option value="conduct">Conducta / Convivencia</option>
                <option value="content">Contenido Inapropiado</option>
                <option value="spam">Spam / Publicidad no deseada</option>
                <option value="harassment">Acoso / Mensajes hostiles</option>
                <option value="terms">Normas comunitarias</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showWarningModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || warningReason.trim().length < 3"
              (click)="submitWarning(targetUser)"
              class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Enviando...' : 'Emitir y Notificar' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: VETAR / BANEAR USUARIO -->
    @if (showBanModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Vetar Usuario Permanentemente</h3>
            </div>
            <button type="button" (click)="showBanModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            Esta acción desactivará todos los roles de <strong class="font-bold">{{ targetUser.full_name }}</strong>, revocará su verificación de atleta e ingresará su correo (<strong>{{ targetUser.email }}</strong>) a la Lista Negra para impedirle volver a entrar o registrarse.
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">Motivo del Veto / Baneo *</label>
              <span class="text-[11px] font-semibold"
                [class.text-rose-500]="banReason.trim().length < 3 || banReason.trim().length > 500"
                [class.text-emerald-600]="banReason.trim().length >= 3 && banReason.trim().length <= 500">
                {{ banReason.trim().length }}/500
              </span>
            </div>
            <textarea
              [(ngModel)]="banReason"
              rows="3"
              maxlength="500"
              placeholder="Indica la razón formal del veto permanente (mínimo 3 caracteres)..."
              class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showBanModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || banReason.trim().length < 3"
              (click)="submitBan(targetUser)"
              class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Baneando...' : 'Confirmar Veto y Bloqueo' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: APROBAR APELACIÓN Y REHABILITAR -->
    @if (showAppealModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Aprobar Apelación y Rehabilitar</h3>
            </div>
            <button type="button" (click)="showAppealModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Usuario: <strong class="text-slate-900">{{ targetUser.full_name }}</strong> ({{ targetUser.email }})
          </div>

          <p class="text-xs text-slate-600">
            Esta acción revocará el veto sobre la cuenta, la removerá de la lista negra, restaurará su rol y le enviará la notificación oficial de reactivación.
          </p>

          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Justificación de la Resolución *</label>
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
                placeholder="Indica el motivo por el cual se acepta la apelación (mínimo 3 caracteres)..."
                class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              ></textarea>
            </div>

            <div class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="modalAppealResetStrikes"
                [(ngModel)]="appealResetStrikes"
                class="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <label for="modalAppealResetStrikes" class="text-xs text-slate-700 cursor-pointer">
                <span class="font-bold text-slate-900">Reiniciar strikes acumulados</span>
                <p class="text-[11px] text-slate-500 mt-0.5">Perdona infracciones pasadas para que empiece de nuevo con 0 strikes.</p>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showAppealModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || appealReason.trim().length < 3"
              (click)="submitAppeal(targetUser)"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Procesando...' : 'Aprobar y Rehabilitar' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: APROBAR APELACIÓN Y ANULAR STRIKE -->
    @if (showAppealStrikeModal() && selectedStrikeForAppeal(); as targetStrike) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Aprobar Apelación y Anular Strike</h3>
            </div>
            <button type="button" (click)="showAppealStrikeModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200/60">
            <div class="flex justify-between">
              <span class="text-slate-500">Puntos a descontar:</span>
              <strong class="text-amber-700 font-bold">-{{ targetStrike.points }} pt</strong>
            </div>
            <div>
              <span class="text-slate-500">Motivo:</span> <span class="text-slate-900 font-medium">{{ targetStrike.reason }}</span>
            </div>
          </div>

          <p class="text-xs text-slate-600">
            Esta acción revocará la amonestación, descontará los puntos del historial del usuario y le enviará la notificación oficial de strike revocado.
          </p>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">Justificación de la Resolución *</label>
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
              placeholder="Indica el motivo por el cual se acepta la apelación de este strike (mínimo 3 caracteres)..."
              class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showAppealStrikeModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || appealStrikeReason.trim().length < 3"
              (click)="submitAppealStrike(targetStrike)"
              class="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Procesando...' : 'Aprobar y Anular Strike' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: SUSPENDER USUARIO -->
    @if (showSuspendModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Suspender Usuario Temporalmente</h3>
            </div>
            <button type="button" (click)="showSuspendModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            La suspensión impedirá el acceso a la cuenta de <strong class="font-bold">{{ targetUser.full_name }}</strong> (<strong>{{ targetUser.email }}</strong>) durante el plazo especificado. Al expirar el período, el sistema reactivará automáticamente el acceso.
          </div>

          <!-- Duración -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Duración de la Suspensión</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                type="button"
                (click)="suspendDays = 3"
                class="rounded-xl border py-2 text-xs font-bold transition cursor-pointer text-center"
                [class.border-amber-500]="suspendDays === 3"
                [class.bg-amber-50]="suspendDays === 3"
                [class.text-amber-800]="suspendDays === 3"
                [class.border-slate-200]="suspendDays !== 3"
                [class.text-slate-600]="suspendDays !== 3"
              >
                3 días
              </button>
              <button
                type="button"
                (click)="suspendDays = 7"
                class="rounded-xl border py-2 text-xs font-bold transition cursor-pointer text-center"
                [class.border-amber-500]="suspendDays === 7"
                [class.bg-amber-50]="suspendDays === 7"
                [class.text-amber-800]="suspendDays === 7"
                [class.border-slate-200]="suspendDays !== 7"
                [class.text-slate-600]="suspendDays !== 7"
              >
                7 días
              </button>
              <button
                type="button"
                (click)="suspendDays = 15"
                class="rounded-xl border py-2 text-xs font-bold transition cursor-pointer text-center"
                [class.border-amber-500]="suspendDays === 15"
                [class.bg-amber-50]="suspendDays === 15"
                [class.text-amber-800]="suspendDays === 15"
                [class.border-slate-200]="suspendDays !== 15"
                [class.text-slate-600]="suspendDays !== 15"
              >
                15 días
              </button>
              <button
                type="button"
                (click)="suspendDays = 30"
                class="rounded-xl border py-2 text-xs font-bold transition cursor-pointer text-center"
                [class.border-amber-500]="suspendDays === 30"
                [class.bg-amber-50]="suspendDays === 30"
                [class.text-amber-800]="suspendDays === 30"
                [class.border-slate-200]="suspendDays !== 30"
                [class.text-slate-600]="suspendDays !== 30"
              >
                30 días
              </button>
            </div>
          </div>

          <!-- Categoría -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Categoría de la Infracción</label>
            <select
              [(ngModel)]="suspendCategory"
              class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="conduct">Conducta Antideportiva / Acoso</option>
              <option value="content">Contenido Inapropiado</option>
              <option value="fraud">Fraude / Suplantación</option>
              <option value="spam">Spam / Abuso de mensajes</option>
              <option value="terms">Violación de Términos de Servicio</option>
            </select>
          </div>

          <!-- Motivo -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">Motivo Formal de la Suspensión *</label>
              <span class="text-[11px] font-semibold"
                [class.text-rose-500]="suspendReason.trim().length < 3 || suspendReason.trim().length > 500"
                [class.text-emerald-600]="suspendReason.trim().length >= 3 && suspendReason.trim().length <= 500">
                {{ suspendReason.trim().length }}/500
              </span>
            </div>
            <textarea
              [(ngModel)]="suspendReason"
              rows="3"
              maxlength="500"
              placeholder="Indica detalladamente el motivo de la suspensión que se enviará al usuario (mínimo 3 caracteres)..."
              class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showSuspendModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction() || suspendReason.trim().length < 3"
              (click)="submitSuspend(targetUser)"
              class="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Suspendiendo...' : 'Confirmar Suspensión' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- SUBMODAL: LEVANTAR SUSPENSIÓN -->
    @if (showUnsuspendModal() && modalUser(); as targetUser) {
      <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </span>
              <h3 class="text-base font-bold text-slate-900">Levantar Suspensión Temporal</h3>
            </div>
            <button type="button" (click)="showUnsuspendModal.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          <div class="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-900 border border-emerald-200">
            ¿Confirmas que deseas levantar anticipadamente la suspensión a <strong class="font-bold">{{ targetUser.full_name }}</strong> (<strong>{{ targetUser.email }}</strong>)?
            <p class="mt-1 text-[11px] text-emerald-800">
              Se reactivará de inmediato su acceso a la plataforma y se le notificará por correo electrónico que su cuenta ha sido reactivada.
            </p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="showUnsuspendModal.set(false)"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="submittingSanction()"
              (click)="submitUnsuspend(targetUser)"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {{ submittingSanction() ? 'Reactivando...' : 'Confirmar y Reactivar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UserCatalogComponent implements OnInit {
  private usersApi = inject(UsersApiService);

  readonly roleOptions = BMS_ROLES;

  // Master raw dataset
  rawUsers = signal<AdminUserCatalogItem[]>([]);
  initialLoading = signal<boolean>(true);
  refreshing = signal<boolean>(false);
  error = signal<string | null>(null);

  // Real-time interactive filter & sort signals
  search = signal<string>('');
  selectedStatus = signal<string>('all'); // all, active, inactive
  selectedRole = signal<string>('all'); // all, athlete, supporter, admin
  selectedGoals = signal<string>('all'); // all, with_goals, without_goals
  selectedRevenue = signal<string>('all'); // all, with_revenue, no_revenue, na
  sortBy = signal<string>('created_at'); // created_at, name
  sortOrder = signal<string>('desc'); // desc, asc
  currentPage = signal<number>(1);
  limit = signal<number>(20);

  // Active header dropdown menu
  activeMenu = signal<string | null>(null);

  // Detail modal
  modalUser = signal<AdminUserCatalogItem | null>(null);

  // Disciplinary Sanctions signals
  userSanctions = signal<DisciplinarySanctionItem[]>([]);
  userSanctionsSummary = signal<UserSanctionsSummary | null>(null);
  loadingSanctions = signal<boolean>(false);
  sanctionFeedback = signal<string | null>(null);

  showWarningModal = signal<boolean>(false);
  warningReason = '';
  warningCategory = 'conduct';

  showStrikeModal = signal<boolean>(false);
  strikeReason = '';
  strikePoints = 1;
  strikeCategory = 'conduct';

  showSuspendModal = signal<boolean>(false);
  showUnsuspendModal = signal<boolean>(false);
  suspendDays = 7;
  suspendReason = '';
  suspendCategory = 'conduct';

  showBanModal = signal<boolean>(false);
  banReason = '';
  showAppealModal = signal<boolean>(false);
  appealReason = '';
  appealResetStrikes = true;
  showAppealStrikeModal = signal<boolean>(false);
  selectedStrikeForAppeal = signal<DisciplinarySanctionItem | null>(null);
  appealStrikeReason = '';
  submittingSanction = signal<boolean>(false);

  // Instant reactive computed filter & sort
  readonly filteredUsers = computed(() => {
    let list = [...this.rawUsers()];

    // 1. Instant search
    const term = this.search().trim().toLowerCase();
    if (term) {
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.athlete_handle?.toLowerCase().includes(term),
      );
    }

    // 2. Status filter
    const st = this.selectedStatus();
    if (st === 'active') {
      list = list.filter((u) => u.is_active && !u.is_suspended && !u.is_banned);
    } else if (st === 'inactive') {
      list = list.filter((u) => !u.is_active && !u.is_suspended && !u.is_banned);
    } else if (st === 'suspended') {
      list = list.filter((u) => u.is_suspended);
    } else if (st === 'banned') {
      list = list.filter((u) => u.is_banned);
    }

    // 3. Role filter
    const r = this.selectedRole();
    if (r !== 'all') {
      list = list.filter((u) => u.roles?.includes(r));
    }

    // 4. Active goals filter
    const g = this.selectedGoals();
    if (g === 'with_goals') {
      list = list.filter((u) => u.active_goals && u.active_goals.length > 0);
    } else if (g === 'without_goals') {
      list = list.filter((u) => !u.active_goals || u.active_goals.length === 0);
    }

    // 5. Revenue filter
    const rev = this.selectedRevenue();
    if (rev === 'with_revenue') {
      list = list.filter((u) => Number(u.financials?.total_raised || 0) > 0);
    } else if (rev === 'no_revenue') {
      list = list.filter(
        (u) => u.roles?.includes('athlete') && Number(u.financials?.total_raised || 0) === 0,
      );
    } else if (rev === 'na') {
      list = list.filter((u) => !u.roles?.includes('athlete'));
    }

    // 6. Sorting
    const by = this.sortBy();
    const order = this.sortOrder();
    if (by === 'name') {
      list.sort((a, b) => {
        const cmp = (a.full_name || '').localeCompare(b.full_name || '');
        return order === 'asc' ? cmp : -cmp;
      });
    } else if (by === 'created_at') {
      list.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return list;
  });

  // Total count of filtered users
  readonly totalFiltered = computed(() => this.filteredUsers().length);

  // Total pages
  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.totalFiltered() / this.limit()));
  });

  // Current page slice
  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.limit();
    return this.filteredUsers().slice(start, start + this.limit());
  });

  // True if any non-default filter is active
  readonly hasActiveFilters = computed(() => {
    return (
      this.search() !== '' ||
      this.selectedStatus() !== 'all' ||
      this.selectedRole() !== 'all' ||
      this.selectedGoals() !== 'all' ||
      this.selectedRevenue() !== 'all' ||
      this.sortBy() !== 'created_at' ||
      this.sortOrder() !== 'desc'
    );
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeMenu()) {
      this.activeMenu.set(null);
    }
  }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.initialLoading.set(true);
    }
    this.error.set(null);

    this.usersApi
      .getCatalog({
        page: 1,
        limit: 100, // Load full set for smooth instant local filtering & sorting
      })
      .subscribe({
        next: (res: AdminUserCatalogResponse) => {
          this.rawUsers.set(res.items);
          this.initialLoading.set(false);
          this.refreshing.set(false);
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || err?.message || 'Error al cargar usuarios');
          this.initialLoading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  reload(): void {
    this.fetchData(true);
  }

  toggleMenu(menuName: string, event: Event): void {
    event.stopPropagation();
    if (this.activeMenu() === menuName) {
      this.activeMenu.set(null);
    } else {
      this.activeMenu.set(menuName);
    }
  }

  onSearchInput(term: string): void {
    this.search.set(term);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.search.set('');
    this.currentPage.set(1);
  }

  setStatus(status: string): void {
    // Toggle off if clicked again
    if (this.selectedStatus() === status && status !== 'all') {
      this.selectedStatus.set('all');
    } else {
      this.selectedStatus.set(status);
    }
    this.activeMenu.set(null);
    this.currentPage.set(1);
  }

  setRole(roleKey: string): void {
    // Toggle off if clicked again
    if (this.selectedRole() === roleKey && roleKey !== 'all') {
      this.selectedRole.set('all');
    } else {
      this.selectedRole.set(roleKey);
    }
    this.activeMenu.set(null);
    this.currentPage.set(1);
  }

  setGoals(goals: string): void {
    // Toggle off if clicked again
    if (this.selectedGoals() === goals && goals !== 'all') {
      this.selectedGoals.set('all');
    } else {
      this.selectedGoals.set(goals);
    }
    this.activeMenu.set(null);
    this.currentPage.set(1);
  }

  setRevenue(revenue: string): void {
    // Toggle off if clicked again
    if (this.selectedRevenue() === revenue && revenue !== 'all') {
      this.selectedRevenue.set('all');
    } else {
      this.selectedRevenue.set(revenue);
    }
    this.activeMenu.set(null);
    this.currentPage.set(1);
  }

  setSort(by: string, order: string): void {
    // Toggle off back to default if clicked again
    if (this.sortBy() === by && this.sortOrder() === order) {
      this.sortBy.set('created_at');
      this.sortOrder.set('desc');
    } else {
      this.sortBy.set(by);
      this.sortOrder.set(order);
    }
    this.activeMenu.set(null);
    this.currentPage.set(1);
  }

  /** Single button that clears all filters and restores full catalog */
  resetFilters(): void {
    this.search.set('');
    this.selectedStatus.set('all');
    this.selectedRole.set('all');
    this.selectedGoals.set('all');
    this.selectedRevenue.set('all');
    this.sortBy.set('created_at');
    this.sortOrder.set('desc');
    this.currentPage.set(1);
    this.activeMenu.set(null);
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.currentPage.set(newPage);
  }

  onLimitChange(newLimit: number | string): void {
    const lim = Number(newLimit) || 20;
    this.limit.set(lim);
    this.currentPage.set(1);
  }

  openUserGoalsModal(user: AdminUserCatalogItem): void {
    this.modalUser.set(user);
    this.sanctionFeedback.set(null);
    this.loadUserSanctions(user.id);
  }

  loadUserSanctions(userId: number): void {
    this.loadingSanctions.set(true);
    this.usersApi.getSanctions(userId).subscribe({
      next: (res) => {
        this.userSanctionsSummary.set(res.result?.summary || null);
        this.userSanctions.set(res.result?.sanctions || []);
        this.loadingSanctions.set(false);
      },
      error: () => {
        this.loadingSanctions.set(false);
      },
    });
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

  isUserBanned(user: AdminUserCatalogItem): boolean {
    return !!(user.is_banned || this.userSanctionsSummary()?.is_banned || this.userSanctionsSummary()?.is_blacklisted);
  }

  isUserSuspended(user: AdminUserCatalogItem): boolean {
    return !!(user.is_suspended || this.userSanctionsSummary()?.is_suspended);
  }

  openWarningModal(user: AdminUserCatalogItem): void {
    if (this.isUserBanned(user)) {
      this.sanctionFeedback.set('El usuario se encuentra vetado. No se pueden emitir advertencias.');
      return;
    }
    if (this.isUserSuspended(user)) {
      this.sanctionFeedback.set('El usuario se encuentra suspendido. No se pueden emitir advertencias.');
      return;
    }
    this.warningReason = '';
    this.warningCategory = 'conduct';
    this.showWarningModal.set(true);
  }

  submitWarning(user: AdminUserCatalogItem): void {
    if (this.warningReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    const payload: IssueWarningPayload = {
      reason: this.warningReason.trim(),
      category: this.warningCategory,
    };

    this.usersApi.issueWarning(user.id, payload).subscribe({
      next: (res) => {
        this.submittingSanction.set(false);
        this.showWarningModal.set(false);
        this.sanctionFeedback.set(res.message || 'Advertencia formal registrada y notificada por correo.');
        this.loadUserSanctions(user.id);
        this.fetchData(true);
      },
      error: (err) => {
        this.submittingSanction.set(false);
        this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al emitir advertencia.'));
      },
    });
  }

  openStrikeModal(user: AdminUserCatalogItem): void {
    if (this.isUserBanned(user)) {
      this.sanctionFeedback.set('El usuario se encuentra vetado. No se pueden aplicar strikes.');
      return;
    }
    if (this.isUserSuspended(user)) {
      this.sanctionFeedback.set('El usuario se encuentra suspendido. No se pueden aplicar strikes.');
      return;
    }
    this.strikeReason = '';
    this.strikePoints = 1;
    this.strikeCategory = 'conduct';
    this.showStrikeModal.set(true);
  }

  submitStrike(user: AdminUserCatalogItem): void {
    if (this.strikeReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    this.usersApi
      .issueStrike(user.id, {
        reason: this.strikeReason.trim(),
        points: Number(this.strikePoints),
        category: this.strikeCategory,
      })
      .subscribe({
        next: (res) => {
          this.submittingSanction.set(false);
          this.showStrikeModal.set(false);
          this.sanctionFeedback.set(res.message || 'Strike registrado correctamente.');
          this.loadUserSanctions(user.id);
          this.fetchData(true);
        },
        error: (err) => {
          this.submittingSanction.set(false);
          this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al aplicar strike.'));
        },
      });
  }

  openBanModal(user: AdminUserCatalogItem): void {
    if (this.isUserBanned(user)) {
      this.sanctionFeedback.set('El usuario ya se encuentra vetado permanentemente.');
      return;
    }
    this.banReason = '';
    this.showBanModal.set(true);
  }

  submitBan(user: AdminUserCatalogItem): void {
    if (this.banReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    this.usersApi
      .banUser(user.id, {
        reason: this.banReason.trim(),
      })
      .subscribe({
        next: (res) => {
          this.submittingSanction.set(false);
          this.showBanModal.set(false);
          this.sanctionFeedback.set(res.message || 'Usuario baneado permanentemente.');
          this.loadUserSanctions(user.id);
          this.fetchData(true);
        },
        error: (err) => {
          this.submittingSanction.set(false);
          this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al banear usuario.'));
        },
      });
  }

  openSuspendModal(user: AdminUserCatalogItem): void {
    if (this.isUserBanned(user)) {
      this.sanctionFeedback.set('El usuario se encuentra vetado. No se puede suspender.');
      return;
    }
    if (this.isUserSuspended(user)) {
      this.sanctionFeedback.set('El usuario ya se encuentra suspendido actualmente.');
      return;
    }
    this.suspendReason = '';
    this.suspendDays = 7;
    this.suspendCategory = 'conduct';
    this.showSuspendModal.set(true);
  }

  submitSuspend(user: AdminUserCatalogItem): void {
    if (this.suspendReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    const payload: SuspendUserPayload = {
      duration_days: Number(this.suspendDays) || 7,
      reason: this.suspendReason.trim(),
      category: this.suspendCategory,
    };

    this.usersApi.suspendUser(user.id, payload).subscribe({
      next: (res) => {
        this.submittingSanction.set(false);
        this.showSuspendModal.set(false);
        this.sanctionFeedback.set(res.message || `Usuario suspendido por ${this.suspendDays} días.`);
        this.loadUserSanctions(user.id);
        this.fetchData(true);
      },
      error: (err) => {
        this.submittingSanction.set(false);
        this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al suspender usuario.'));
      },
    });
  }

  openUnsuspendModal(user: AdminUserCatalogItem): void {
    this.showUnsuspendModal.set(true);
  }

  submitUnsuspend(user: AdminUserCatalogItem): void {
    this.submittingSanction.set(true);

    this.usersApi.unsuspendUser(user.id).subscribe({
      next: (res) => {
        this.submittingSanction.set(false);
        this.showUnsuspendModal.set(false);
        this.sanctionFeedback.set(res.message || 'Suspensión levantada y cuenta reactivada con éxito.');
        this.loadUserSanctions(user.id);
        this.fetchData(true);
      },
      error: (err) => {
        this.submittingSanction.set(false);
        this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al levantar la suspensión.'));
      },
    });
  }

  closeModal(): void {
    this.modalUser.set(null);
    this.showWarningModal.set(false);
    this.showStrikeModal.set(false);
    this.showBanModal.set(false);
    this.showAppealModal.set(false);
    this.showAppealStrikeModal.set(false);
    this.selectedStrikeForAppeal.set(null);
    this.showSuspendModal.set(false);
    this.showUnsuspendModal.set(false);
  }

  getStatusLabel(st: string): string {
    switch (st) {
      case 'active':
        return 'Solo Activos';
      case 'inactive':
        return 'Solo Inactivos';
      case 'suspended':
        return 'Solo Suspendidos';
      case 'banned':
        return 'Solo Vetados';
      default:
        return 'Todos';
    }
  }

  openAppealStrikeModal(strike: DisciplinarySanctionItem, user: AdminUserCatalogItem): void {
    this.selectedStrikeForAppeal.set(strike);
    this.appealStrikeReason = '';
    this.showAppealStrikeModal.set(true);
  }

  submitAppealStrike(strike: DisciplinarySanctionItem): void {
    if (this.appealStrikeReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    const payload: AppealStrikePayload = {
      resolution_reason: this.appealStrikeReason.trim(),
    };

    this.usersApi.appealStrike(strike.id, payload).subscribe({
      next: (res) => {
        this.submittingSanction.set(false);
        this.showAppealStrikeModal.set(false);
        this.selectedStrikeForAppeal.set(null);
        this.sanctionFeedback.set(res.message || 'Strike anulado con éxito.');
        const u = this.modalUser();
        if (u) {
          this.loadUserSanctions(u.id);
        }
        this.fetchData(true);
      },
      error: (err) => {
        this.submittingSanction.set(false);
        this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al tramitar la apelación del strike.'));
      },
    });
  }

  openAppealModal(user: AdminUserCatalogItem): void {
    this.appealReason = '';
    this.appealResetStrikes = true;
    this.showAppealModal.set(true);
  }

  submitAppeal(user: AdminUserCatalogItem): void {
    if (this.appealReason.trim().length < 3) return;
    this.submittingSanction.set(true);

    const payload: AppealBanPayload = {
      resolution_reason: this.appealReason.trim(),
      reset_strikes: this.appealResetStrikes,
    };

    this.usersApi.appealBanUser(user.id, payload).subscribe({
      next: (res) => {
        this.submittingSanction.set(false);
        this.showAppealModal.set(false);
        this.sanctionFeedback.set(res.message || 'Apelación aprobada con éxito. Usuario rehabilitado.');
        this.loadUserSanctions(user.id);
        this.fetchData(true);
      },
      error: (err) => {
        this.submittingSanction.set(false);
        this.sanctionFeedback.set(this.extractApiErrorMessage(err, 'Error al tramitar la apelación.'));
      },
    });
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  getRoleLabel(roleKey: string): string {
    const found = this.roleOptions.find((r) => r.key === roleKey);
    return found ? found.label : roleKey;
  }

  getRevenueLabel(revKey: string): string {
    switch (revKey) {
      case 'with_revenue':
        return 'Con recaudación (> $0)';
      case 'no_revenue':
        return 'Sin recaudación ($0)';
      case 'na':
        return 'No aplica (--)';
      default:
        return revKey;
    }
  }
}

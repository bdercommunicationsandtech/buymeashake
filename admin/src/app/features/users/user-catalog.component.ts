import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersApiService } from '../../core/services/users-api.service';
import {
  AdminGoalSummary,
  AdminUserCatalogItem,
  AdminUserCatalogResponse,
  BMS_ROLES,
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
                Estado: {{ selectedStatus() === 'active' ? 'Solo Activos' : 'Solo Inactivos' }}
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
                    <div class="absolute left-3 top-11 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5">
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
                      @if (user.is_active) {
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
                  @if (user.is_active) {
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
      list = list.filter((u) => u.is_active);
    } else if (st === 'inactive') {
      list = list.filter((u) => !u.is_active);
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
  }

  closeModal(): void {
    this.modalUser.set(null);
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

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrustReportsApiService } from '../../core/services/trust-reports-api.service';
import {
  AdminReportVerdictPayload,
  REASON_CODE_LABELS,
  REPORT_PRIORITY_OPTIONS,
  REPORT_STATUS_OPTIONS,
  TrustReport,
  VERDICT_OPTIONS,
} from '../../core/models/trust-report.model';

@Component({
  selector: 'app-reports-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">

      <!-- Header Section -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-rose-500"></span>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Trust & Safety</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Reportes de Cumplimiento</h2>
          <p class="mt-1 text-sm text-slate-500">
            Cola de moderación y denuncias de la comunidad BuyMeAShake para atletas y contenidos.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          @if (!loading()) {
            @if (pendingCount() > 0) {
              <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {{ pendingCount() }} pendientes
              </span>
            }
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              @if (hasActiveFilters()) {
                {{ reports().length }} de {{ total() }} reportes
              } @else {
                {{ total() }} reportes
              }
            </span>
          }

          <!-- Clear Filters -->
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-rose-100 hover:text-rose-800 focus:outline-none cursor-pointer"
              title="Restablecer filtros"
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
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none disabled:opacity-50 cursor-pointer"
            title="Sincronizar denuncias"
          >
            <svg class="h-3.5 w-3.5" [class.animate-spin]="refreshing()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <!-- Search & Status Selectors -->
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <!-- Search input -->
        <div class="relative w-full max-w-sm">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            [ngModel]="search()"
            (ngModelChange)="onSearchInput($event)"
            placeholder="Buscar por folio, creador o correo..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-9 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          @if (search()) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </button>
          }
        </div>

        <!-- Filters group -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Status select -->
          <select
            [ngModel]="statusFilter()"
            (ngModelChange)="onStatusChange($event)"
            class="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            @for (opt of statusOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>

          <!-- Priority select -->
          <select
            [ngModel]="priorityFilter()"
            (ngModelChange)="onPriorityChange($event)"
            class="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            @for (opt of priorityOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Active Filters Chips -->
      @if (hasActiveFilters()) {
        <div class="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-[11px] font-semibold text-slate-400">Filtros activos:</span>
          @if (search()) {
            <span class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              Texto: "{{ search() }}"
              <button type="button" (click)="clearSearch()" class="font-bold text-slate-400 hover:text-slate-700">×</button>
            </span>
          }
          @if (statusFilter() !== 'all') {
            <span class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
              Estado: {{ getStatusLabel(statusFilter()) }}
              <button type="button" (click)="onStatusChange('all')" class="font-bold text-rose-500 hover:text-rose-800">×</button>
            </span>
          }
          @if (priorityFilter() !== 'all') {
            <span class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
              Prioridad: {{ getPriorityLabel(priorityFilter()) }}
              <button type="button" (click)="onPriorityChange('all')" class="font-bold text-indigo-500 hover:text-indigo-800">×</button>
            </span>
          }
        </div>
      }

      <!-- Main Content Table / Loading / Empty -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600"></div>
          <p class="mt-3 text-xs font-medium text-slate-400">Cargando cola de moderación...</p>
        </div>
      } @else if (reports().length === 0) {
        <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-slate-900">No se encontraron denuncias</h3>
          <p class="mt-1 max-w-sm text-xs text-slate-500">
            @if (hasActiveFilters()) {
              No hay reportes que coincidan con los filtros aplicados.
            } @else {
              No hay denuncias activas en la plataforma. ¡Excelente trabajo de cumplimiento!
            }
          </p>
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Restablecer filtros
            </button>
          }
        </div>
      } @else {
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" class="py-3 pl-4 pr-3">Folio</th>
                <th scope="col" class="px-3 py-3">Atleta / Creador</th>
                <th scope="col" class="px-3 py-3">Motivo / Título</th>
                <th scope="col" class="px-3 py-3">Denunciante</th>
                <th scope="col" class="px-3 py-3">Estado</th>
                <th scope="col" class="px-3 py-3">Fecha</th>
                <th scope="col" class="py-3 pl-3 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (report of reports(); track report.id) {
                <tr class="transition-colors hover:bg-slate-50/70">
                  <!-- Folio & Priority -->
                  <td class="py-3.5 pl-4 pr-3 font-semibold text-slate-900">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-xs font-bold text-slate-900">{{ report.folio }}</span>
                    </div>
                    <div class="mt-1">
                      <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" [ngClass]="getPriorityBadgeClass(report.priority)">
                        {{ getPriorityLabel(report.priority) }}
                      </span>
                    </div>
                  </td>

                  <!-- Athlete info -->
                  <td class="px-3 py-3.5">
                    <div class="flex items-center gap-2.5">
                      <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white shadow-inner ring-1 ring-slate-200">
                        @if (report.athlete_avatar) {
                          <img [src]="report.athlete_avatar" [alt]="report.creator_target" class="h-full w-full object-cover" />
                        } @else {
                          <span>{{ (report.athlete_handle?.[0] || report.creator_target[1] || 'A') | uppercase }}</span>
                        }
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-semibold text-slate-900">{{ report.athlete_name || report.creator_target }}</p>
                        @if (report.athlete_handle) {
                          <a
                            [href]="'https://buymeashake.fit/@' + report.athlete_handle"
                            target="_blank"
                            class="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:underline"
                          >
                            <span>&#64;{{ report.athlete_handle }}</span>
                            <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        } @else {
                          <span class="text-[11px] text-slate-400">{{ report.creator_target }}</span>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Reason -->
                  <td class="max-w-[220px] px-3 py-3.5">
                    <span class="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {{ getReasonLabel(report.reason_code) }}
                    </span>
                    <p class="mt-1 truncate font-medium text-slate-800" [title]="report.reason_title">{{ report.reason_title }}</p>
                    <p class="truncate text-[11px] text-slate-400" [title]="report.description">{{ report.description }}</p>
                  </td>

                  <!-- Reporter -->
                  <td class="px-3 py-3.5">
                    <span class="font-mono text-[11px] text-slate-600">{{ report.reporter_email }}</span>
                    @if (report.evidence_links && report.evidence_links.length > 0) {
                      <div class="mt-0.5 flex items-center gap-1 text-[10px] text-indigo-600">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        </svg>
                        <span>{{ report.evidence_links.length }} enlace(s)</span>
                      </div>
                    }
                  </td>

                  <!-- Status -->
                  <td class="px-3 py-3.5">
                    <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold" [ngClass]="getStatusBadgeClass(report.status)">
                      <span class="h-1.5 w-1.5 rounded-full" [ngClass]="getStatusDotClass(report.status)"></span>
                      {{ getStatusLabel(report.status) }}
                    </span>
                    @if (report.verdict) {
                      <div class="mt-1 text-[10px] font-medium text-slate-500">
                        Veredicto: <strong class="capitalize">{{ report.verdict.replace('_', ' ') }}</strong>
                      </div>
                    }
                  </td>

                  <!-- Date -->
                  <td class="whitespace-nowrap px-3 py-3.5 text-slate-500">
                    <p>{{ report.created_at | date:'dd/MM/yyyy' }}</p>
                    <p class="text-[10px] text-slate-400">{{ report.created_at | date:'HH:mm' }}</p>
                  </td>

                  <!-- Actions -->
                  <td class="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @if (report.status === 'pending') {
                        <button
                          type="button"
                          (click)="markUnderReview(report)"
                          class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                          title="Iniciar revisión"
                        >
                          Revisar
                        </button>
                      }

                      <button
                        type="button"
                        (click)="openDetail(report)"
                        class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        title="Ver detalle completo"
                      >
                        <span>Detalles</span>
                      </button>

                      @if (report.status !== 'resolved' && report.status !== 'dismissed') {
                        <button
                          type="button"
                          (click)="openVerdictModal(report)"
                          class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 shadow-sm cursor-pointer"
                          title="Emitir dictamen oficial"
                        >
                          <span>Dictaminar</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Drawer / Modal de Detalle Completo -->
      @if (selectedReport(); as r) {
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div class="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">

            <!-- Modal Header -->
            <div class="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-lg font-extrabold text-slate-900">{{ r.folio }}</span>
                  <span class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" [ngClass]="getPriorityBadgeClass(r.priority)">
                    {{ getPriorityLabel(r.priority) }}
                  </span>
                  <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold" [ngClass]="getStatusBadgeClass(r.status)">
                    {{ getStatusLabel(r.status) }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-400">Registrado el {{ r.created_at | date:'medium' }}</p>
              </div>

              <button
                type="button"
                (click)="closeDetail()"
                class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Modal Body Details -->
            <div class="space-y-4 text-xs">

              <!-- Target info card -->
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atleta denunciado</span>
                <div class="mt-2 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                      {{ (r.athlete_handle?.[0] || 'A') | uppercase }}
                    </div>
                    <div>
                      <p class="font-bold text-slate-900">{{ r.athlete_name || r.creator_target }}</p>
                      <p class="font-mono text-[11px] text-slate-500">{{ r.creator_target }}</p>
                    </div>
                  </div>
                  @if (r.athlete_handle) {
                    <a
                      [href]="'https://buymeashake.fit/@' + r.athlete_handle"
                      target="_blank"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <span>Ver Perfil Público</span>
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  }
                </div>
              </div>

              <!-- Report content -->
              <div class="space-y-2">
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motivo del reporte</span>
                  <div class="mt-1 flex items-center gap-2">
                    <span class="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-100">
                      {{ getReasonLabel(r.reason_code) }}
                    </span>
                    <span class="font-semibold text-slate-800">{{ r.reason_title }}</span>
                  </div>
                </div>

                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción detallada</span>
                  <div class="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-slate-700 leading-relaxed">
                    {{ r.description }}
                  </div>
                </div>

                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo denunciante</span>
                  <p class="mt-1 font-mono text-xs text-slate-600">{{ r.reporter_email }}</p>
                </div>

                <!-- Evidence Links -->
                @if (r.evidence_links && r.evidence_links.length > 0) {
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enlaces de evidencia</span>
                    <ul class="mt-1 space-y-1">
                      @for (link of r.evidence_links; track link) {
                        <li>
                          <a [href]="link" target="_blank" class="inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 hover:underline">
                            <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span class="truncate">{{ link }}</span>
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                }

                <!-- Evidence File -->
                @if (r.attached_file) {
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Archivo de evidencia</span>
                    <p class="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                      <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>{{ r.attached_file }}</span>
                    </p>
                  </div>
                }
              </div>

              <!-- Verdict resolution status if resolved -->
              @if (r.verdict) {
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div class="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <svg class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Veredicto Dictaminado: {{ r.verdict_title || r.verdict }}</span>
                  </div>
                  @if (r.admin_notes) {
                    <p class="mt-2 text-xs text-slate-600"><strong class="text-slate-800">Notas de resolución:</strong> {{ r.admin_notes }}</p>
                  }
                  @if (r.action_details) {
                    <p class="mt-1 text-xs text-slate-600"><strong class="text-slate-800">Acción ejecutada:</strong> {{ r.action_details }}</p>
                  }
                  <p class="mt-2 text-[10px] text-slate-400">
                    Resuelto por {{ r.assigned_moderator_name || 'Admin' }} el {{ r.resolved_at | date:'medium' }}
                  </p>
                </div>
              }
            </div>

            <!-- Modal Footer Buttons -->
            <div class="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                (click)="closeDetail()"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>

              @if (r.status === 'pending') {
                <button
                  type="button"
                  (click)="markUnderReview(r); closeDetail()"
                  class="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                >
                  Pasar a En Revisión
                </button>
              }

              @if (r.status !== 'resolved' && r.status !== 'dismissed') {
                <button
                  type="button"
                  (click)="openVerdictModal(r)"
                  class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 cursor-pointer"
                >
                  Emitir Dictamen Oficial
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal de Dictamen / Veredicto Formal -->
      @if (isVerdictModalOpen() && targetVerdictReport(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div class="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">

            <div class="mb-5 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-lg font-bold text-slate-900">Emitir Dictamen Oficial</h3>
                <p class="text-xs text-slate-500">Folio: <strong class="font-mono text-slate-700">{{ target.folio }}</strong> · Contra: <strong>{{ target.creator_target }}</strong></p>
              </div>
              <button
                type="button"
                (click)="closeVerdictModal()"
                class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Form -->
            <div class="space-y-4 text-xs">

              <!-- Verdict Option Cards -->
              <div>
                <label class="mb-1.5 block font-bold text-slate-700">Selecciona el tipo de resolución:</label>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  @for (opt of verdictOptions; track opt.value) {
                    <div
                      (click)="verdictType.set(opt.value)"
                      class="cursor-pointer rounded-2xl border p-3 transition-all"
                      [class.border-rose-500]="verdictType() === opt.value && opt.tone === 'rose'"
                      [class.bg-rose-50]="verdictType() === opt.value && opt.tone === 'rose'"
                      [class.border-amber-500]="verdictType() === opt.value && opt.tone === 'amber'"
                      [class.bg-amber-50]="verdictType() === opt.value && opt.tone === 'amber'"
                      [class.border-slate-800]="verdictType() === opt.value && opt.tone === 'slate'"
                      [class.bg-slate-100]="verdictType() === opt.value && opt.tone === 'slate'"
                      [class.border-slate-200]="verdictType() !== opt.value"
                      [class.bg-white]="verdictType() !== opt.value"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-bold" [class.text-rose-700]="opt.tone === 'rose'" [class.text-amber-700]="opt.tone === 'amber'" [class.text-slate-800]="opt.tone === 'slate'">
                          {{ opt.label }}
                        </span>
                        <input type="radio" [checked]="verdictType() === opt.value" class="h-3 w-3" />
                      </div>
                      <p class="text-[10px] text-slate-500 leading-tight">{{ opt.description }}</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Title -->
              <div>
                <label class="mb-1 block font-semibold text-slate-700">Título del dictamen:</label>
                <input
                  type="text"
                  [ngModel]="verdictTitle()"
                  (ngModelChange)="verdictTitle.set($event)"
                  placeholder="Ej. Infracción confirmada de normas deportivas"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <!-- Admin Notes -->
              <div>
                <label class="mb-1 block font-semibold text-slate-700">Fundamentación / Notas de la resolución:</label>
                <textarea
                  rows="3"
                  [ngModel]="verdictNotes()"
                  (ngModelChange)="verdictNotes.set($event)"
                  placeholder="Explica las razones del dictamen técnico para conocimiento del denunciante y registro interno..."
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                ></textarea>
              </div>

              <!-- Action Details -->
              <div>
                <label class="mb-1 block font-semibold text-slate-700">Detalles de la medida aplicada (opcional):</label>
                <input
                  type="text"
                  [ngModel]="verdictActionDetails()"
                  (ngModelChange)="verdictActionDetails.set($event)"
                  placeholder="Ej. Cuenta suspendida por 14 días y post eliminado"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <!-- Notice info -->
              <div class="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-800 flex items-start gap-2">
                <svg class="h-4 w-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Al emitir este veredicto, el reporte pasará automáticamente a estado <strong>Resuelto</strong> y se despachará un correo electrónico de confirmación formal al denunciante (<strong>{{ target.reporter_email }}</strong>).
                </span>
              </div>

              @if (verdictError()) {
                <div class="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-600">
                  {{ verdictError() }}
                </div>
              }
            </div>

            <!-- Modal Action Buttons -->
            <div class="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                (click)="closeVerdictModal()"
                [disabled]="verdictSubmitting()"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="submitVerdict()"
                [disabled]="verdictSubmitting() || !verdictTitle() || !verdictNotes()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                @if (verdictSubmitting()) {
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Procesando...</span>
                } @else {
                  <span>Confirmar y Notificar Dictamen</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
})
export class ReportsPanelComponent implements OnInit {
  private api = inject(TrustReportsApiService);

  // Lists & Counters
  reports = signal<TrustReport[]>([]);
  loading = signal<boolean>(true);
  refreshing = signal<boolean>(false);
  total = signal<number>(0);
  pendingCount = signal<number>(0);

  // Filters
  search = signal<string>('');
  statusFilter = signal<string>('all');
  priorityFilter = signal<string>('all');

  // Filter Options
  statusOptions = REPORT_STATUS_OPTIONS;
  priorityOptions = REPORT_PRIORITY_OPTIONS;
  verdictOptions = VERDICT_OPTIONS;

  // Modals state
  selectedReport = signal<TrustReport | null>(null);
  targetVerdictReport = signal<TrustReport | null>(null);
  isVerdictModalOpen = signal<boolean>(false);
  verdictSubmitting = signal<boolean>(false);
  verdictError = signal<string | null>(null);

  // Verdict form fields
  verdictType = signal<'action_taken' | 'warning' | 'dismissed'>('action_taken');
  verdictTitle = signal<string>('');
  verdictNotes = signal<string>('');
  verdictActionDetails = signal<string>('');

  hasActiveFilters = computed(() => {
    return Boolean(this.search() || this.statusFilter() !== 'all' || this.priorityFilter() !== 'all');
  });

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading.set(true);
    this.api
      .getList({
        status_filter: this.statusFilter(),
        priority_filter: this.priorityFilter(),
        search: this.search(),
        limit: 50,
      })
      .subscribe({
        next: (res) => {
          this.reports.set(res.result || []);
          this.total.set(res.total ?? (res.result ? res.result.length : 0));
          if (res.pending_count !== undefined) {
            this.pendingCount.set(res.pending_count);
          }
          this.loading.set(false);
          this.refreshing.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  reload(): void {
    this.refreshing.set(true);
    this.loadReports();
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.loadReports();
  }

  clearSearch(): void {
    this.search.set('');
    this.loadReports();
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.loadReports();
  }

  onPriorityChange(priority: string): void {
    this.priorityFilter.set(priority);
    this.loadReports();
  }

  resetFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.priorityFilter.set('all');
    this.loadReports();
  }

  openDetail(report: TrustReport): void {
    this.selectedReport.set(report);
  }

  closeDetail(): void {
    this.selectedReport.set(null);
  }

  markUnderReview(report: TrustReport): void {
    this.api.updateStatus(report.folio || report.id, { status: 'under_review' }).subscribe({
      next: (updated) => {
        this.reports.update((list) => list.map((r) => (r.id === report.id ? { ...r, status: 'under_review' } : r)));
        if (this.selectedReport()?.id === report.id) {
          this.selectedReport.set({ ...this.selectedReport()!, status: 'under_review' });
        }
        this.reload();
      },
    });
  }

  openVerdictModal(report: TrustReport): void {
    this.targetVerdictReport.set(report);
    this.verdictType.set('action_taken');
    this.verdictTitle.set(`Resolución oficial para folio ${report.folio}`);
    this.verdictNotes.set('');
    this.verdictActionDetails.set('');
    this.verdictError.set(null);
    this.isVerdictModalOpen.set(true);
  }

  closeVerdictModal(): void {
    this.isVerdictModalOpen.set(false);
    this.targetVerdictReport.set(null);
    this.verdictSubmitting.set(false);
  }

  submitVerdict(): void {
    const report = this.targetVerdictReport();
    if (!report) return;

    this.verdictSubmitting.set(true);
    this.verdictError.set(null);

    const payload: AdminReportVerdictPayload = {
      reporter_email: report.reporter_email,
      creator_target: report.creator_target,
      verdict: this.verdictType(),
      verdict_title: this.verdictTitle(),
      admin_notes: this.verdictNotes(),
      action_details: this.verdictActionDetails() || undefined,
    };

    this.api.submitVerdict(report.folio || report.id, payload).subscribe({
      next: () => {
        this.verdictSubmitting.set(false);
        this.closeVerdictModal();
        this.closeDetail();
        this.reload();
      },
      error: (err) => {
        this.verdictSubmitting.set(false);
        this.verdictError.set(err?.error?.detail || 'Error al procesar el dictamen.');
      },
    });
  }

  // Label and Styling Helpers
  getReasonLabel(code: string): string {
    return REASON_CODE_LABELS[code?.toLowerCase()] || code || 'Infracción';
  }

  getStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'Pendiente';
      case 'under_review':
        return 'En revisión';
      case 'resolved':
        return 'Resuelto';
      case 'dismissed':
        return 'Descartado';
      default:
        return status;
    }
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'under_review':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'resolved':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'dismissed':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  }

  getStatusDotClass(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-amber-500 animate-pulse';
      case 'under_review':
        return 'bg-indigo-500';
      case 'resolved':
        return 'bg-emerald-500';
      case 'dismissed':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  }

  getPriorityLabel(priority: string): string {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'critical':
        return 'Crítica';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return priority || 'Media';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'medium':
        return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }
}

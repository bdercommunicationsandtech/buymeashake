import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TrustReportsApiService } from '../../core/services/trust-reports-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { extractApiErrorMessage } from '../../shared/utils/api-error.util';
import { API_CONFIG } from '../../core/config/api.config';
import { AdminUser } from '../../core/models/user.model';
import {
  ALLOWED_STATUS_TRANSITIONS,
  REASON_CATEGORY_LABELS,
  REPORT_PRIORITY_OPTIONS,
  REPORT_STATUS_OPTIONS,
  RESOLUTION_ACTION_OPTIONS,
  ReportPriority,
  ReportStatus,
  TARGET_TYPE_LABELS,
  TargetEntityType,
  TrustReport,
} from '../../core/models/trust-report.model';

interface TargetPreview {
  id: number;
  name: string;
  imageUrls: string[];
}

interface QuickAction {
  id: string;
  label: string;
  status: ReportStatus;
  action: string;
  /** SVG path for heroicon-style outline icon */
  iconPath: string;
  tone: 'amber' | 'rose' | 'orange' | 'slate' | 'emerald';
}

@Component({
  selector: 'app-reports-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">

      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Reportes</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Catálogo de moderación desde trust_reports
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          @if (pendingCount() > 0) {
            <span class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {{ pendingCount() }} pendientes (página)
            </span>
          }
          @if (total() > 0) {
            <span class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {{ total() }} total
            </span>
          }
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer disabled:opacity-60"
            [disabled]="loading()"
            (click)="loadReports()"
          >
            Actualizar
          </button>
        </div>
      </header>

      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
          class="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Filtrar por estado"
        >
          <option [ngValue]="''">Todos los estados</option>
          @for (opt of statusOptions; track opt.value) {
            <option [ngValue]="opt.value">{{ opt.label }}</option>
          }
        </select>

        <select
          [(ngModel)]="priorityFilter"
          (ngModelChange)="onFilterChange()"
          class="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Filtrar por prioridad"
        >
          <option [ngValue]="''">Todas las prioridades</option>
          @for (opt of priorityOptions; track opt.value) {
            <option [ngValue]="opt.value">{{ opt.label }}</option>
          }
        </select>

        <select
          [ngModel]="pageSize()"
          (ngModelChange)="onPageSizeChange($event)"
          class="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Tamaño de página"
        >
          <option [ngValue]="20">20 por página</option>
          <option [ngValue]="50">50 por página</option>
          <option [ngValue]="100">100 por página</option>
        </select>
      </div>

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

      @if (loading()) {
        <div class="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando reportes...</span>
          </div>
        </div>
      } @else if (reports().length === 0) {
        <div class="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 text-center">
          <p class="text-base font-semibold text-slate-700">No hay reportes</p>
          <p class="mt-1 text-sm text-slate-500">Prueba cambiando los filtros o espera nuevos envíos desde la app.</p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Catálogo de reportes">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Folio</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Asunto</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Objetivo</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Prioridad</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Creado</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (r of reports(); track r.id) {
                  <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                    <td class="px-4 py-3 text-xs font-mono text-slate-400">#{{ r.id }}</td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800 max-w-xs truncate">{{ r.subject }}</div>
                      <div class="text-xs text-slate-500 mt-0.5">Reportante #{{ r.reporter_user_id }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-xs font-semibold text-slate-700">{{ targetLabel(r.target_type) }}</div>
                      <div class="text-xs font-mono text-slate-400">#{{ r.target_id }}</div>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium text-slate-600">
                      {{ reasonLabel(r.reason_category) }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1"
                        [ngClass]="priorityBadgeClass(r.priority)"
                      >
                        {{ priorityLabel(r.priority) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1"
                        [ngClass]="statusBadgeClass(r.status)"
                      >
                        {{ statusLabel(r.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {{ r.created_at | date: 'dd/MM/yyyy HH:mm' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button
                        type="button"
                        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 cursor-pointer"
                        (click)="openDetail(r)"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs font-medium text-slate-500">
              Mostrando {{ fromRecord() }}–{{ toRecord() }} de {{ total() }}
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                [disabled]="page() <= 1 || loading()"
                (click)="goPrev()"
              >
                Anterior
              </button>
              <span class="text-xs font-semibold text-slate-600">Pág. {{ page() }} / {{ totalPages() }}</span>
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                [disabled]="page() >= totalPages() || loading()"
                (click)="goNext()"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Detail slide-over -->
      @if (selected(); as report) {
        <div
          class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          (click)="closeDetail()"
        ></div>

        <aside
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col overflow-hidden rounded-l-2xl border-l border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-in"
          role="dialog"
          aria-label="Detalle del reporte"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-100/80 bg-white/70 px-5 py-4 backdrop-blur-md">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4a4 4 0 014-4h10a4 4 0 014 4v4M7 13V7a5 5 0 0110 0v6"/>
                  </svg>
                </span>
                <h2 class="text-lg font-extrabold text-slate-900">Reporte #{{ report.id }}</h2>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1"
                  [ngClass]="statusBadgeClass(report.status)"
                >
                  {{ statusLabel(report.status) }}
                </span>
              </div>
              <p class="mt-1 text-xs font-medium text-slate-500">
                {{ targetLabel(report.target_type) }} #{{ report.target_id }}
                · Prioridad {{ priorityLabel(report.priority) }}
                · Reportante #{{ report.reporter_user_id }}
              </p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              (click)="closeDetail()"
              aria-label="Cerrar"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-5">
            <div class="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              <!-- Left: report context -->
              <div class="space-y-4">
                <section class="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div class="flex items-start gap-3">
                    <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.5h.008M10.34 3.94l-7.1 12.3A1.5 1.5 0 004.54 18.5h14.92a1.5 1.5 0 001.3-2.26l-7.1-12.3a1.5 1.5 0 00-2.6 0z"/>
                      </svg>
                    </span>
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">Motivo del reporte</p>
                      <p class="mt-1 text-sm font-semibold text-slate-800">{{ report.subject }}</p>
                      <p class="mt-0.5 text-xs font-medium text-amber-800/80">{{ reasonLabel(report.reason_category) }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción del reportante</p>
                  <p class="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{{ report.message || '—' }}</p>
                </section>

                <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {{ isProductTarget(report.target_type) ? 'Producto reportado' : 'Objetivo reportado' }}
                  </p>
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      class="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 p-0 cursor-pointer disabled:cursor-default"
                      [disabled]="!(targetPreview()?.imageUrls?.length)"
                      (click)="openProductLightbox(0)"
                      [attr.aria-label]="'Ver imagen del producto'"
                    >
                      @if (targetPreview()?.imageUrls?.length) {
                        <img
                          [src]="targetPreview()!.imageUrls[0]"
                          alt=""
                          class="h-full w-full object-cover"
                          (error)="$any($event.target).style.opacity='0.3'"
                        />
                      } @else {
                        <div class="flex h-full w-full items-center justify-center text-slate-400">
                          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/>
                          </svg>
                        </div>
                      }
                    </button>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-slate-900">
                        {{ targetPreview()?.name || (targetLabel(report.target_type) + ' #' + report.target_id) }}
                      </p>
                      <p class="mt-0.5 text-xs font-mono text-slate-400">#{{ report.target_id }}</p>
                      @if (isProductTarget(report.target_type)) {
                        <button
                          type="button"
                          class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                          (click)="openTargetListing(report)"
                        >
                          Ver publicación
                          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </div>

                  @if (targetPreview()?.imageUrls?.length) {
                    <div class="mt-3">
                      <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Imágenes del producto ({{ targetPreview()!.imageUrls.length }})
                      </p>
                      <div class="flex flex-wrap gap-2">
                        @for (img of targetPreview()!.imageUrls; track img; let i = $index) {
                          <button
                            type="button"
                            (click)="openProductLightbox(i)"
                            class="h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200 hover:ring-indigo-300 transition cursor-pointer p-0"
                            [attr.aria-label]="'Ver imagen del producto ' + (i + 1)"
                          >
                            <img
                              [src]="img"
                              alt="Producto {{ i + 1 }}"
                              class="h-full w-full object-cover"
                              (error)="$any($event.target).style.opacity='0.3'"
                            />
                          </button>
                        }
                      </div>
                      <p class="mt-2 text-[11px] font-medium text-slate-400">
                        Haz clic en una imagen para ampliarla
                      </p>
                    </div>
                  }
                </section>

                @if (report.evidence_images?.length) {
                  <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Evidencia ({{ report.evidence_images!.length }}
                      {{ report.evidence_images!.length === 1 ? 'imagen' : 'imágenes' }})
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (img of report.evidence_images!; track img; let i = $index) {
                        <button
                          type="button"
                          (click)="openEvidenceLightbox(report.evidence_images!, i)"
                          class="h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200 hover:ring-indigo-300 transition cursor-pointer p-0"
                          [attr.aria-label]="'Ver evidencia ' + (i + 1)"
                        >
                          <img
                            [src]="evidenceImageSrc(img)"
                            alt="Evidencia {{ i + 1 }}"
                            class="h-full w-full object-cover"
                            (error)="$any($event.target).style.opacity='0.3'"
                          />
                        </button>
                      }
                    </div>
                    <p class="mt-2 text-[11px] font-medium text-slate-400">
                      Haz clic en una imagen para ampliarla
                    </p>
                  </section>
                }

                @if (report.resolution_action || report.resolution_notes) {
                  <section class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Resolución previa</p>
                    @if (report.resolution_action) {
                      <p class="mt-1 text-sm font-semibold text-emerald-900">
                        {{ resolutionLabel(report.resolution_action) }}
                      </p>
                    }
                    @if (report.resolution_notes) {
                      <p class="mt-1 text-sm text-emerald-800 whitespace-pre-wrap">{{ report.resolution_notes }}</p>
                    }
                  </section>
                }

                <p class="text-xs text-slate-400">
                  Creado: {{ report.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  @if (report.resolved_at) {
                    · Resuelto: {{ report.resolved_at | date: 'dd/MM/yyyy HH:mm' }}
                  }
                </p>
              </div>

              <!-- Right: reporter + moderation -->
              <div class="space-y-4">
                <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Reportante</p>
                  <div class="flex items-center gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                      {{ reporterInitials() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-slate-900">
                        {{ reporterDisplayName() }}
                      </p>
                      <p class="text-xs font-medium text-slate-500">
                        @if (reporter()?.registration_date) {
                          Miembro desde {{ reporter()!.registration_date | date: 'dd/MM/yyyy' }}
                        } @else {
                          Usuario #{{ report.reporter_user_id }}
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    (click)="openReporterProfile(report.reporter_user_id)"
                  >
                    Ver perfil
                  </button>
                </section>

                <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Historial del usuario</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="rounded-xl bg-slate-50 px-3 py-2.5">
                      <p class="text-lg font-extrabold text-slate-800">{{ reporter()?.enforcement?.active_strikes_count || 0 }}</p>
                      <p class="text-[11px] font-semibold text-slate-500">Strikes activos</p>
                    </div>
                    <div class="rounded-xl bg-slate-50 px-3 py-2.5">
                      <p class="text-sm font-bold text-slate-800">
                        {{ reporter()?.enforcement?.status || 'ACTIVE' }}
                      </p>
                      <p class="text-[11px] font-semibold text-slate-500">Estado</p>
                    </div>
                  </div>
                </section>

                @if (availableTransitions().length > 0) {
                  <section class="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                    <h3 class="text-sm font-extrabold text-slate-900">Moderación</h3>

                    <div>
                      <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Estado
                      </label>
                      <select
                        [(ngModel)]="nextStatus"
                        (ngModelChange)="onStatusSelect()"
                        class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        @for (s of availableTransitions(); track s) {
                          <option [ngValue]="s">{{ statusLabel(s) }}</option>
                        }
                      </select>
                    </div>

                    <div>
                      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Acción rápida</p>
                      <div class="grid grid-cols-2 gap-2">
                        @for (qa of quickActions; track qa.id) {
                          <button
                            type="button"
                            class="group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition cursor-pointer"
                            [ngClass]="selectedQuickAction() === qa.id
                              ? 'border-indigo-300 bg-indigo-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                            (click)="applyQuickAction(qa)"
                          >
                            <span
                              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1"
                              [ngClass]="selectedQuickAction() === qa.id
                                ? 'bg-white/15 text-white ring-white/25'
                                : quickActionIconClass(qa.tone)"
                            >
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="qa.iconPath"/>
                              </svg>
                            </span>
                            <span class="min-w-0 flex-1 text-xs font-semibold leading-snug">{{ qa.label }}</span>
                          </button>
                        }
                      </div>
                    </div>

                    @if (requiresResolution()) {
                      <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Acción de resolución
                        </label>
                        <select
                          [(ngModel)]="resolutionAction"
                          class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option [ngValue]="''">Seleccionar...</option>
                          @for (opt of resolutionOptions; track opt.value) {
                            <option [ngValue]="opt.value">{{ opt.label }}</option>
                          }
                        </select>
                      </div>

                      @if (resolutionAction === 'DUPLICATE') {
                        <div>
                          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Folio del reporte principal
                          </label>
                          <input
                            type="number"
                            [(ngModel)]="duplicateOf"
                            min="1"
                            class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="ID del reporte original"
                          />
                        </div>
                      }
                    }

                    <div>
                      <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Notas del moderador
                      </label>
                      <textarea
                        [(ngModel)]="resolutionNotes"
                        rows="3"
                        placeholder="Escribe una nota (opcional)..."
                        class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                      ></textarea>
                    </div>

                    @if (actionError()) {
                      <p class="text-xs font-medium text-red-600">{{ actionError() }}</p>
                    }
                  </section>
                } @else {
                  <section class="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
                    <p class="text-sm text-slate-500">
                      Este reporte ya está cerrado; no admite más transiciones.
                    </p>
                  </section>
                }
              </div>
            </div>
          </div>

          @if (availableTransitions().length > 0) {
            <div class="flex items-center justify-end gap-2 border-t border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                [disabled]="saving()"
                (click)="closeDetail()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                [disabled]="saving() || !canSubmitTransition()"
                (click)="submitTransition()"
              >
                @if (saving()) {
                  Guardando...
                } @else {
                  Guardar cambios
                }
              </button>
            </div>
          }
        </aside>
      }


      @if (evidenceLightbox(); as lb) {
        <div
          class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista de imagen"
          (click)="closeEvidenceLightbox()"
        >
          <button
            type="button"
            class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
            (click)="closeEvidenceLightbox()"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>

          @if (lb.urls.length > 1) {
            <button
              type="button"
              class="absolute left-3 sm:left-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer disabled:opacity-30"
              (click)="$event.stopPropagation(); prevEvidence()"
              [disabled]="lb.index <= 0"
              aria-label="Anterior"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button
              type="button"
              class="absolute right-3 sm:right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer disabled:opacity-30"
              (click)="$event.stopPropagation(); nextEvidence()"
              [disabled]="lb.index >= lb.urls.length - 1"
              aria-label="Siguiente"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          }

          <div class="flex max-h-[90vh] max-w-[95vw] flex-col items-center gap-3" (click)="$event.stopPropagation()">
            <img
              [src]="evidenceImageSrc(lb.urls[lb.index])"
              alt="Evidencia {{ lb.index + 1 }}"
              class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <p class="text-sm font-medium text-white/80">
              {{ lb.index + 1 }} / {{ lb.urls.length }}
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsPanelComponent implements OnInit {
  private api = inject(TrustReportsApiService);
  private usersApi = inject(UsersApiService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly statusOptions = REPORT_STATUS_OPTIONS;
  readonly priorityOptions = REPORT_PRIORITY_OPTIONS;
  readonly resolutionOptions = RESOLUTION_ACTION_OPTIONS;
  readonly quickActions: QuickAction[] = [
    {
      id: 'warning',
      label: 'Advertencia',
      status: 'RESOLVED',
      action: 'WARNING',
      tone: 'amber',
      iconPath: 'M12 9v3.75m0 3.5h.008M10.34 3.94l-7.1 12.3A1.5 1.5 0 004.54 18.5h14.92a1.5 1.5 0 001.3-2.26l-7.1-12.3a1.5 1.5 0 00-2.6 0z',
    },
    {
      id: 'remove',
      label: 'Eliminar publicación',
      status: 'RESOLVED',
      action: 'LISTING_REMOVED',
      tone: 'rose',
      iconPath: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    },
    {
      id: 'suspend',
      label: 'Suspender',
      status: 'RESOLVED',
      action: 'TEMP_SUSPENSION',
      tone: 'orange',
      iconPath: 'M15.75 5.25v13.5m-7.5-13.5v13.5',
    },
    {
      id: 'ban',
      label: 'Ban',
      status: 'RESOLVED',
      action: 'PERMANENT_BAN',
      tone: 'rose',
      iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
    },
    {
      id: 'dismiss',
      label: 'Ignorar reporte',
      status: 'DISMISSED',
      action: 'NO_VIOLATION',
      tone: 'emerald',
      iconPath: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  reports = signal<TrustReport[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(50);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  actionError = signal<string | null>(null);
  evidenceLightbox = signal<{ urls: string[]; index: number } | null>(null);
  reporter = signal<AdminUser | null>(null);
  targetPreview = signal<TargetPreview | null>(null);
  selectedQuickAction = signal<string | null>(null);

  statusFilter: ReportStatus | '' = '';
  priorityFilter: ReportPriority | '' = '';

  selected = signal<TrustReport | null>(null);
  nextStatus: ReportStatus = 'UNDER_REVIEW';
  resolutionAction = '';
  resolutionNotes = '';
  duplicateOf: number | null = null;

  pendingCount = computed(() => this.reports().filter((r) => r.status === 'PENDING').length);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize()) || 1));

  fromRecord = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  toRecord = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  availableTransitions = computed(() => {
    const report = this.selected();
    if (!report) return [] as ReportStatus[];
    return ALLOWED_STATUS_TRANSITIONS[report.status] ?? [];
  });

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading.set(true);
    this.error.set(null);
    const offset = (this.page() - 1) * this.pageSize();

    this.api
      .getList({
        status_filter: this.statusFilter || undefined,
        priority_filter: this.priorityFilter || undefined,
        limit: this.pageSize(),
        offset,
      })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res.result) ? res.result : [];
          this.reports.set(list);
          this.total.set(res.total ?? list.length);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los reportes.'));
          this.reports.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadReports();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size) || 50);
    this.page.set(1);
    this.loadReports();
  }

  goPrev(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadReports();
  }

  goNext(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.loadReports();
  }

  openDetail(report: TrustReport): void {
    this.selected.set(report);
    this.actionError.set(null);
    this.success.set(null);
    this.selectedQuickAction.set(null);
    this.reporter.set(null);
    this.targetPreview.set(null);
    const next = ALLOWED_STATUS_TRANSITIONS[report.status]?.[0];
    this.nextStatus = next ?? report.status;
    this.resolutionAction = '';
    this.resolutionNotes = '';
    this.duplicateOf = null;
    this.loadReporter(report.reporter_user_id);
    this.loadTargetPreview(report);
  }

  closeDetail(): void {
    if (this.saving()) return;
    this.closeEvidenceLightbox();
    this.selected.set(null);
    this.actionError.set(null);
    this.reporter.set(null);
    this.targetPreview.set(null);
    this.selectedQuickAction.set(null);
  }

  private loadReporter(userId: number): void {
    this.usersApi.getById(userId).subscribe({
      next: (res) => this.reporter.set(res.result ?? null),
      error: () => this.reporter.set(null),
    });
  }

  private loadTargetPreview(report: TrustReport): void {
    if (report.target_type === 'USER') {
      this.usersApi.getById(report.target_id).subscribe({
        next: (res) => {
          const u = res.result;
          if (!u) return;
          this.targetPreview.set({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `Usuario #${u.id}`,
            imageUrls: [],
          });
        },
        error: () => {
          this.targetPreview.set({
            id: report.target_id,
            name: `Usuario #${report.target_id}`,
            imageUrls: [],
          });
        },
      });
      return;
    }

    if (!this.isProductTarget(report.target_type)) {
      this.targetPreview.set({
        id: report.target_id,
        name: `${this.targetLabel(report.target_type)} #${report.target_id}`,
        imageUrls: [],
      });
      return;
    }

    const kind = report.target_type === 'SELLER_PRODUCT' ? 'seller' : 'buyer';
    this.http.get<any>(`${API_CONFIG.baseUrl}/products/${kind}/${report.target_id}`).subscribe({
      next: (res) => {
        const product = Array.isArray(res?.result) ? res.result[0] : res?.result;
        if (!product) {
          this.targetPreview.set({
            id: report.target_id,
            name: `Producto #${report.target_id}`,
            imageUrls: [],
          });
          return;
        }
        this.targetPreview.set({
          id: product.id ?? report.target_id,
          name: product.name || `Producto #${report.target_id}`,
          imageUrls: this.extractProductImages(product),
        });
      },
      error: () => {
        this.targetPreview.set({
          id: report.target_id,
          name: `Producto #${report.target_id}`,
          imageUrls: [],
        });
      },
    });
  }

  private extractProductImages(product: any): string[] {
    const urls: string[] = [];
    const pushRaw = (raw: unknown) => {
      if (raw == null) return;
      const src = this.evidenceImageSrc(String(raw));
      if (src && !urls.includes(src)) urls.push(src);
    };

    const list = product?.images_list || product?.relational_images;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === 'string') {
          pushRaw(item);
          continue;
        }
        pushRaw(item?.url || item?.file_name || item?.fileName);
      }
    }

    if (urls.length === 0) {
      const images = product?.images;
      if (typeof images === 'string' && images.trim()) {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (typeof item === 'string') pushRaw(item);
              else pushRaw(item?.url || item?.file_name || item?.fileName);
            }
          } else {
            pushRaw(images);
          }
        } catch {
          // Comma/space separated paths or single path
          const parts = images.split(/[\s,]+/).filter(Boolean);
          for (const part of parts) pushRaw(part);
        }
      } else if (Array.isArray(images)) {
        for (const item of images) {
          if (typeof item === 'string') pushRaw(item);
          else pushRaw(item?.url || item?.file_name || item?.fileName);
        }
      }
    }

    return urls;
  }

  openProductLightbox(index: number): void {
    const urls = this.targetPreview()?.imageUrls;
    if (!urls?.length) return;
    this.openEvidenceLightbox(urls, index);
  }

  isProductTarget(type: TargetEntityType): boolean {
    return type === 'BUYER_PRODUCT' || type === 'SELLER_PRODUCT';
  }

  reporterDisplayName(): string {
    const u = this.reporter();
    const report = this.selected();
    if (!u) return report ? `Usuario #${report.reporter_user_id}` : 'Usuario';
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return full || u.username || `Usuario #${u.id}`;
  }

  reporterInitials(): string {
    const u = this.reporter();
    if (!u) return '?';
    const a = (u.first_name?.[0] || u.username?.[0] || u.email?.[0] || '?').toUpperCase();
    const b = (u.last_name?.[0] || '').toUpperCase();
    return `${a}${b}`.trim() || '?';
  }

  openReporterProfile(userId: number): void {
    void this.router.navigate(['/users'], { queryParams: { id: userId } });
  }

  openTargetListing(report: TrustReport): void {
    const path = report.target_type === 'SELLER_PRODUCT' ? '/listings/sell' : '/listings/buy';
    void this.router.navigate([path], { queryParams: { id: report.target_id } });
  }

  applyQuickAction(qa: QuickAction): void {
    const allowed = this.availableTransitions();
    if (allowed.includes(qa.status)) {
      this.nextStatus = qa.status;
    }
    this.selectedQuickAction.set(qa.id);
    this.resolutionAction = qa.action;
    if (!this.resolutionNotes.trim()) {
      this.resolutionNotes = qa.label;
    }
  }

  quickActionIconClass(tone: QuickAction['tone']): string {
    switch (tone) {
      case 'amber':
        return 'bg-amber-50 text-amber-600 ring-amber-100';
      case 'rose':
        return 'bg-rose-50 text-rose-600 ring-rose-100';
      case 'orange':
        return 'bg-orange-50 text-orange-600 ring-orange-100';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 ring-emerald-100';
      default:
        return 'bg-slate-50 text-slate-600 ring-slate-200';
    }
  }

  onStatusSelect(): void {
    if (!this.requiresResolution()) {
      this.selectedQuickAction.set(null);
      this.resolutionAction = '';
    }
  }

  openEvidenceLightbox(urls: string[], index: number): void {
    this.evidenceLightbox.set({ urls: [...urls], index });
  }

  closeEvidenceLightbox(): void {
    this.evidenceLightbox.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.evidenceLightbox()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeEvidenceLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prevEvidence();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextEvidence();
      }
      return;
    }
    if (this.selected() && event.key === 'Escape' && !this.saving()) {
      event.preventDefault();
      this.closeDetail();
    }
  }

  prevEvidence(): void {
    this.evidenceLightbox.update((lb) => {
      if (!lb || lb.index <= 0) return lb;
      return { ...lb, index: lb.index - 1 };
    });
  }

  nextEvidence(): void {
    this.evidenceLightbox.update((lb) => {
      if (!lb || lb.index >= lb.urls.length - 1) return lb;
      return { ...lb, index: lb.index + 1 };
    });
  }

  requiresResolution(): boolean {
    return this.nextStatus === 'RESOLVED' || this.nextStatus === 'DISMISSED';
  }

  canSubmitTransition(): boolean {
    if (!this.nextStatus) return false;
    if (!this.requiresResolution()) return true;
    if (!this.resolutionAction.trim()) return false;
    if (this.resolutionAction === 'DUPLICATE' && (!this.duplicateOf || this.duplicateOf < 1)) {
      return false;
    }
    return true;
  }

  submitTransition(): void {
    const report = this.selected();
    if (!report || !this.canSubmitTransition()) return;

    const notes = this.resolutionNotes.trim()
      || (this.requiresResolution()
        ? (this.resolutionOptions.find((o) => o.value === this.resolutionAction)?.label
          || this.resolutionAction)
        : '');

    this.saving.set(true);
    this.actionError.set(null);

    this.api
      .updateStatus(report.id, {
        status: this.nextStatus,
        resolution_action: this.requiresResolution() ? this.resolutionAction.trim() : undefined,
        resolution_notes: this.requiresResolution() ? notes : undefined,
        duplicate_of:
          this.requiresResolution() && this.resolutionAction === 'DUPLICATE' && this.duplicateOf
            ? this.duplicateOf
            : undefined,
      })
      .subscribe({
        next: (res) => {
          const updated = res.result?.[0];
          this.saving.set(false);
          this.success.set(res.message || `Reporte #${report.id} actualizado.`);
          this.selected.set(null);
          this.reporter.set(null);
          this.targetPreview.set(null);
          if (updated) {
            this.reports.update((list) =>
              list.map((r) => (r.id === updated.id ? updated : r)),
            );
          }
          this.loadReports();
        },
        error: (err) => {
          this.saving.set(false);
          this.actionError.set(extractApiErrorMessage(err, 'No se pudo actualizar el reporte.'));
        },
      });
  }

  statusLabel(status: ReportStatus): string {
    return this.statusOptions.find((o) => o.value === status)?.label ?? status;
  }

  priorityLabel(priority: ReportPriority): string {
    return this.priorityOptions.find((o) => o.value === priority)?.label ?? priority;
  }

  targetLabel(type: TargetEntityType): string {
    return TARGET_TYPE_LABELS[type] ?? type;
  }

  reasonLabel(code: string): string {
    return REASON_CATEGORY_LABELS[code] ?? code;
  }

  resolutionLabel(code: string): string {
    return this.resolutionOptions.find((o) => o.value === code)?.label ?? code;
  }

  evidenceImageSrc(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
    const origin = API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  }

  statusBadgeClass(status: ReportStatus): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 ring-amber-200';
      case 'UNDER_REVIEW':
        return 'bg-sky-50 text-sky-700 ring-sky-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-600 ring-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 ring-slate-200';
    }
  }

  priorityBadgeClass(priority: ReportPriority): string {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 ring-rose-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 ring-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 ring-amber-200';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 ring-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 ring-slate-200';
    }
  }
}

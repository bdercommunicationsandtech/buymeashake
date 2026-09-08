import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { API_CONFIG } from '../../core/config/api.config';
import { ContactApiService } from '../../core/services/contact-api.service';
import { extractApiErrorMessage } from '../../shared/utils/api-error.util';
import {
  CONTACT_READ_FILTER_OPTIONS,
  ContactReadFilter,
  ContactTicket,
} from '../../core/models/contact-ticket.model';

@Component({
  selector: 'app-contact-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">

      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Tickets de soporte</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Mensajes enviados desde el formulario de Help en la app
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          @if (unreadCount() > 0) {
            <span class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {{ unreadCount() }} sin leer
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
            (click)="reload()"
          >
            Actualizar
          </button>
        </div>
      </header>

      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          [ngModel]="readFilter()"
          (ngModelChange)="onFilterChange($event)"
          class="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Filtrar por lectura"
        >
          @for (opt of readFilterOptions; track opt.value) {
            <option [ngValue]="opt.value">{{ opt.label }}</option>
          }
        </select>

        <input
          type="search"
          [ngModel]="searchQuery()"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Buscar nombre, correo o asunto…"
          class="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Buscar tickets"
        />
      </div>

      @if (error()) {
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {{ error() }}
        </div>
      }

      @if (loading() && tickets().length === 0) {
        <div class="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <span class="text-sm font-medium text-slate-500">Cargando tickets…</span>
          </div>
        </div>
      } @else if (filteredTickets().length === 0) {
        <div class="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 text-center">
          <p class="text-base font-semibold text-slate-700">No hay tickets</p>
          <p class="mt-1 text-sm text-slate-500">
            Cuando alguien envíe el formulario de Help aparecerán aquí.
          </p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Catálogo de tickets de soporte">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Folio</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Remitente</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Asunto</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (t of filteredTickets(); track t.id) {
                  <tr
                    class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40"
                    [class.bg-amber-50/40]="!t.read"
                  >
                    <td class="px-4 py-3 text-xs font-mono text-slate-400">#{{ t.id }}</td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-800 max-w-[220px] truncate">{{ t.full_name }}</div>
                      <div class="text-xs text-slate-500 mt-0.5 max-w-[220px] truncate">{{ t.mail }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div
                        class="max-w-xs truncate"
                        [class.font-bold]="!t.read"
                        [class.text-slate-900]="!t.read"
                        [class.font-semibold]="t.read"
                        [class.text-slate-800]="t.read"
                      >
                        {{ t.subject }}
                      </div>
                      <div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span class="max-w-xs truncate">{{ t.message }}</span>
                        @if (t.images?.length) {
                          <span
                            class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                            [attr.title]="t.images!.length + ' adjunto(s)'"
                          >
                            <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                              <path fill="currentColor" d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z"/>
                            </svg>
                            {{ t.images!.length }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      @if (t.read) {
                        <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          Leído
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          Nuevo
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {{ t.date | date: 'dd/MM/yyyy' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button
                        type="button"
                        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 cursor-pointer"
                        (click)="openDetail(t)"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs font-medium text-slate-500">
              Mostrando {{ filteredTickets().length }} de {{ tickets().length }} cargados
              @if (total() > tickets().length) {
                · {{ total() }} en total
              }
            </p>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              [disabled]="!hasMore() || loadingMore()"
              (click)="loadMore()"
            >
              {{ loadingMore() ? 'Cargando…' : 'Cargar más' }}
            </button>
          </div>
        </div>
      }

      @if (selected(); as ticket) {
        <div
          class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          (click)="closeDetail()"
        ></div>

        <aside
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-hidden rounded-l-2xl border-l border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl"
          role="dialog"
          aria-label="Detalle del ticket"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-100/80 bg-white/70 px-5 py-4 backdrop-blur-md">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                </span>
                <h2 class="text-lg font-extrabold text-slate-900">Ticket #{{ ticket.id }}</h2>
                @if (ticket.read) {
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Leído
                  </span>
                } @else {
                  <span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    Nuevo
                  </span>
                }
              </div>
              <p class="mt-1 text-xs font-medium text-slate-500">
                {{ ticket.date | date: 'dd/MM/yyyy' }}
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

          <div class="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            @if (detailLoading()) {
              <div class="flex min-h-[120px] items-center justify-center">
                <div class="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            } @else {
              <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remitente</p>
                <p class="mt-1 text-sm font-bold text-slate-900">{{ ticket.full_name }}</p>
                <a
                  class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  [href]="'mailto:' + ticket.mail + '?subject=Re: ' + ticket.subject"
                >
                  {{ ticket.mail }}
                </a>
              </section>

              <section class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Asunto</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ ticket.subject }}</p>
              </section>

              <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensaje</p>
                <p class="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{{ ticket.message }}</p>
              </section>

              @if (ticket.images?.length) {
                <section class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Adjuntos ({{ ticket.images!.length }}
                    {{ ticket.images!.length === 1 ? 'imagen' : 'imágenes' }})
                  </p>
                  <div class="flex flex-wrap gap-2">
                    @for (img of ticket.images!; track img; let i = $index) {
                      <button
                        type="button"
                        (click)="openLightbox(ticket.images!, i)"
                        class="h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200 hover:ring-indigo-300 transition cursor-pointer p-0"
                        [attr.aria-label]="'Ver adjunto ' + (i + 1)"
                      >
                        <img
                          [src]="imageSrc(img)"
                          alt="Adjunto {{ i + 1 }}"
                          class="h-full w-full object-cover"
                          (error)="$any($event.target).style.opacity='0.3'"
                        />
                      </button>
                    }
                  </div>
                  <p class="mt-3 text-[11px] text-slate-400">Haz clic en una imagen para ampliarla</p>
                </section>
              }
            }
          </div>

          <div class="border-t border-slate-100 bg-white/80 px-5 py-4">
            <a
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              [href]="'mailto:' + ticket.mail + '?subject=Re: ' + ticket.subject"
            >
              Responder por correo
            </a>
          </div>
        </aside>
      }

      @if (lightbox(); as lb) {
        <div
          class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista de imagen"
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

          @if (lb.urls.length > 1) {
            <button
              type="button"
              class="absolute left-3 sm:left-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer disabled:opacity-30"
              (click)="$event.stopPropagation(); prevImage()"
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
              (click)="$event.stopPropagation(); nextImage()"
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
              [src]="imageSrc(lb.urls[lb.index])"
              alt="Adjunto {{ lb.index + 1 }}"
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
export class ContactPanelComponent implements OnInit {
  private contactApi = inject(ContactApiService);

  readonly readFilterOptions = CONTACT_READ_FILTER_OPTIONS;

  tickets = signal<ContactTicket[]>([]);
  selected = signal<ContactTicket | null>(null);
  lightbox = signal<{ urls: string[]; index: number } | null>(null);
  loading = signal(false);
  loadingMore = signal(false);
  detailLoading = signal(false);
  error = signal('');
  total = signal(0);
  readCount = signal(0);
  hasMore = signal(false);
  pageSize = 50;

  readFilter = signal<ContactReadFilter>('');
  searchQuery = signal('');

  unreadCount = computed(() => Math.max(0, this.total() - this.readCount()));

  filteredTickets = computed(() => {
    let list = this.tickets();
    const readFilter = this.readFilter();
    if (readFilter === 'unread') {
      list = list.filter((t) => !t.read);
    } else if (readFilter === 'read') {
      list = list.filter((t) => t.read);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.mail.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q),
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
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prevImage();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextImage();
        return;
      }
      return;
    }
    if (event.key === 'Escape' && this.selected()) {
      event.preventDefault();
      this.closeDetail();
    }
  }

  openLightbox(urls: string[], index: number): void {
    this.lightbox.set({ urls: [...urls], index });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  prevImage(): void {
    this.lightbox.update((lb) => (!lb || lb.index <= 0 ? lb : { ...lb, index: lb.index - 1 }));
  }

  nextImage(): void {
    this.lightbox.update((lb) =>
      !lb || lb.index >= lb.urls.length - 1 ? lb : { ...lb, index: lb.index + 1 },
    );
  }

  imageSrc(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
    const origin = API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  }

  onFilterChange(value: ContactReadFilter): void {
    this.readFilter.set(value);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  reload(): void {
    this.error.set('');
    this.loading.set(true);
    this.contactApi.getList({ last_id: 0, limit: this.pageSize }).subscribe({
      next: (res) => {
        const rows = res.result ?? [];
        this.tickets.set(rows);
        this.applyTotalsFrom(rows);
        this.hasMore.set(rows.length >= this.pageSize);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los tickets.'));
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
        this.applyTotalsFrom(rows.length ? rows : current);
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
    this.detailLoading.set(true);
    this.contactApi.getById(ticket.id).subscribe({
      next: (res) => {
        const updated = res.result?.[0] ?? { ...ticket, read: true };
        this.selected.set(updated);
        this.tickets.update((list) =>
          list.map((t) => (t.id === updated.id ? { ...t, ...updated, read: true } : t)),
        );
        if (!ticket.read) {
          this.readCount.update((n) => Math.min(this.total(), n + 1));
        }
        this.detailLoading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo abrir el ticket.'));
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.selected.set(null);
    this.lightbox.set(null);
  }

  private applyTotalsFrom(rows: ContactTicket[]): void {
    const sample = rows[0];
    if (sample?.total != null) this.total.set(sample.total);
    if (sample?.read_count != null) this.readCount.set(sample.read_count);
  }
}

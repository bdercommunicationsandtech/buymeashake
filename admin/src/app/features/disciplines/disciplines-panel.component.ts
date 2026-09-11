import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../core/config/environment';
import { DisciplinesApiService } from '../../core/services/disciplines-api.service';
import {
  DisciplineAdminItem,
  DisciplineFormState,
} from '../../core/models/discipline.model';

function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    const origin = new URL(environment.apiBaseUrl).origin;
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
  } catch {
    return url;
  }
}

@Component({
  selector: 'app-disciplines-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 px-4 py-8 sm:px-6 lg:px-8">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Disciplinas</h1>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Catálogo canónico: registro, explore, perfiles y carrusel de Home
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer disabled:opacity-60"
          [disabled]="loading()"
          (click)="openCreate()"
        >
          Agregar disciplina
        </button>
      </header>

      @if (success()) {
        <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {{ success() }}
        </div>
      }
      @if (error()) {
        <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {{ error() }}
        </div>
      }

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        @if (loading()) {
          <p class="p-8 text-sm text-slate-500">Cargando disciplinas…</p>
        } @else if (items().length === 0) {
          <p class="p-8 text-sm text-slate-500">No hay disciplinas. Ejecuta la migración SQL o crea una.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead class="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                    <th class="px-4 py-3">Media</th>
                  <th class="px-4 py-3">Nombre</th>
                  <th class="px-4 py-3">Subtítulo</th>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Orden</th>
                  <th class="px-4 py-3">Home</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (d of items(); track d.id) {
                  <tr class="hover:bg-slate-50/80">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="h-12 w-16 overflow-hidden rounded-lg bg-slate-100">
                          @if (d.image_url) {
                            <img [src]="resolve(d.image_url)" alt="" class="h-full w-full object-cover" />
                          }
                        </div>
                        <div class="h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 grid place-items-center">
                          @if (d.icon_url) {
                            <img [src]="resolve(d.icon_url)" alt="" class="h-4 w-4 object-contain" />
                          } @else {
                            <span class="text-[10px] text-slate-400">—</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 font-semibold text-slate-900">{{ d.name }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ d.description || '—' }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ d.id }}</td>
                    <td class="px-4 py-3">{{ d.sort_order }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        [class.bg-lime-100]="d.show_in_home"
                        [class.text-lime-800]="d.show_in_home"
                        [class.bg-slate-100]="!d.show_in_home"
                        [class.text-slate-500]="!d.show_in_home"
                      >
                        {{ d.show_in_home ? 'Sí' : 'No' }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        [class.bg-emerald-100]="d.is_active"
                        [class.text-emerald-800]="d.is_active"
                        [class.bg-rose-100]="!d.is_active"
                        [class.text-rose-700]="!d.is_active"
                      >
                        {{ d.is_active ? 'Activa' : 'Inactiva' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" class="text-indigo-600 font-semibold hover:underline cursor-pointer mr-3" (click)="openEdit(d)">Editar</button>
                      @if (d.is_active) {
                        <button type="button" class="text-rose-600 font-semibold hover:underline cursor-pointer" (click)="deactivate(d)">Desactivar</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      @if (modalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" (click)="closeModal()">
          <div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-bold text-slate-900">{{ editingId() ? 'Editar disciplina' : 'Nueva disciplina' }}</h2>
            <p class="mt-1 text-xs text-slate-500">Subtítulo = descripción corta del carrusel Home.</p>

            <div class="mt-5 space-y-4">
              <label class="block text-xs font-bold text-slate-600">
                Nombre
                <input type="text" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" [(ngModel)]="form.name" />
              </label>
              <label class="block text-xs font-bold text-slate-600">
                Subtítulo / descripción
                <input type="text" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" [(ngModel)]="form.description" placeholder="RUTA & GRAVEL" />
              </label>
              <label class="block text-xs font-bold text-slate-600">
                Orden
                <input type="number" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" [(ngModel)]="form.sort_order" />
              </label>

              <div class="flex flex-wrap gap-4">
                <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.show_in_home" class="rounded border-slate-300" />
                  Mostrar en Home
                </label>
                <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.is_active" class="rounded border-slate-300" />
                  Activa
                </label>
              </div>

              <div>
                <p class="text-xs font-bold text-slate-600 mb-2">Imagen de fondo</p>
                @if (form.image_url) {
                  <img [src]="resolve(form.image_url)" alt="" class="mb-2 h-28 w-full rounded-xl object-cover" />
                }
                <input type="file" accept="image/*" (change)="onUpload($event, 'image')" [disabled]="uploading()" />
              </div>

              <div>
                <p class="text-xs font-bold text-slate-600 mb-2">Icono</p>
                @if (form.icon_url) {
                  <img [src]="resolve(form.icon_url)" alt="" class="mb-2 h-10 w-10 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1" />
                }
                <input type="file" accept=".svg,image/svg+xml,image/png,image/webp" (change)="onUpload($event, 'icon')" [disabled]="uploading()" />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer" (click)="closeModal()">Cancelar</button>
              <button
                type="button"
                class="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-60"
                [disabled]="saving() || uploading()"
                (click)="save()"
              >
                {{ saving() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DisciplinesPanelComponent implements OnInit {
  private readonly api = inject(DisciplinesApiService);

  readonly items = signal<DisciplineAdminItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  form: DisciplineFormState = this.emptyForm();

  ngOnInit(): void {
    this.reload();
  }

  resolve(url: string | null | undefined): string {
    return mediaUrl(url);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las disciplinas.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.modalOpen.set(true);
  }

  openEdit(d: DisciplineAdminItem): void {
    this.editingId.set(d.id);
    this.form = {
      name: d.name,
      description: d.description || '',
      image_url: d.image_url || '',
      icon_url: d.icon_url || '',
      sort_order: d.sort_order,
      show_in_home: d.show_in_home,
      is_active: d.is_active,
    };
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onUpload(event: Event, kind: 'image' | 'icon'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    const req$ = kind === 'icon' ? this.api.uploadIcon(file) : this.api.uploadImage(file);
    req$.subscribe({
      next: (res) => {
        if (kind === 'image') this.form.image_url = res.url;
        else this.form.icon_url = res.url;
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Error al subir el archivo.');
        this.uploading.set(false);
      },
    });
  }

  save(): void {
    const name = this.form.name.trim();
    if (!name) {
      this.error.set('El nombre es obligatorio.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const id = this.editingId();
    if (id == null) {
      this.api
        .create({
          name,
          description: this.form.description.trim() || null,
          image_url: this.form.image_url || null,
          icon_url: this.form.icon_url || null,
          sort_order: this.form.sort_order,
          show_in_home: this.form.show_in_home,
          is_active: this.form.is_active,
        })
        .subscribe({
          next: () => this.afterSave('Disciplina creada.'),
          error: (err) => {
            this.error.set(err?.error?.detail || 'No se pudo crear.');
            this.saving.set(false);
          },
        });
      return;
    }

    this.api
      .update(id, {
        name,
        description: this.form.description.trim() || null,
        image_url: this.form.image_url || null,
        icon_url: this.form.icon_url || null,
        sort_order: this.form.sort_order,
        show_in_home: this.form.show_in_home,
        is_active: this.form.is_active,
      })
      .subscribe({
        next: () => this.afterSave('Disciplina actualizada.'),
        error: (err) => {
          this.error.set(err?.error?.detail || 'No se pudo actualizar.');
          this.saving.set(false);
        },
      });
  }

  deactivate(d: DisciplineAdminItem): void {
    if (!confirm(`¿Desactivar "${d.name}"?`)) return;
    this.api.deactivate(d.id).subscribe({
      next: () => {
        this.success.set('Disciplina desactivada.');
        this.reload();
      },
      error: () => this.error.set('No se pudo desactivar.'),
    });
  }

  private afterSave(msg: string): void {
    this.saving.set(false);
    this.success.set(msg);
    this.modalOpen.set(false);
    this.reload();
  }

  private emptyForm(): DisciplineFormState {
    return {
      name: '',
      description: '',
      image_url: '',
      icon_url: '',
      sort_order: 0,
      show_in_home: false,
      is_active: true,
    };
  }
}

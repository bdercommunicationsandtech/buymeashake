import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DisciplinesApiService } from '../../core/services/disciplines-api.service';
import { DisciplineAdminItem } from '../../core/models/discipline.model';
import { mediaUrl } from '../../core/utils/media-url.util';

interface DisciplineFormState {
  name: string;
  description: string;
  image_url: string;
  icon_url: string;
  sort_order: number;
  show_in_home: boolean;
  is_active: boolean;
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
        <div class="flex flex-wrap items-center gap-3">
          @if (items().length > 0) {
            <span
              class="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
            >
              {{ items().length }} registros
            </span>
          }
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none cursor-pointer disabled:opacity-60"
            [disabled]="loading() || saving()"
            (click)="openCreate()"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Agregar disciplina
          </button>
        </div>
      </header>

      @if (success()) {
        <div
          class="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          {{ success() }}
        </div>
      }

      @if (error()) {
        <div
          class="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {{ error() }}
        </div>
      }

      <div class="relative flex flex-col gap-4">
        @if ((loading() || saving()) && !modalOpen()) {
          <div
            class="absolute inset-0 z-10 flex min-h-[240px] items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm"
            role="status"
          >
            <div class="flex flex-col items-center gap-3">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <span class="text-sm font-medium text-slate-500">
                {{ loading() ? 'Cargando disciplinas...' : 'Procesando...' }}
              </span>
            </div>
          </div>
        }

        <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-md">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Gestión de disciplinas">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    ID
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Media
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nombre
                  </th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Orden
                  </th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Home
                  </th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (d of items(); track d.id) {
                  <tr class="border-b border-slate-50 transition-colors hover:bg-indigo-50/40">
                    <td class="px-6 py-4 text-xs font-mono text-slate-400">#{{ d.id }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        @if (d.image_url) {
                          <img
                            [src]="resolve(d.image_url)"
                            [alt]="d.name"
                            class="h-12 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                            (error)="$any($event.target).style.opacity='0.3'"
                          />
                        } @else {
                          <span class="text-xs italic text-slate-400">Sin imagen</span>
                        }
                          @if (d.icon_url) {
                            <div
                              class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0b120c] ring-1 ring-slate-200"
                              title="Vista con color de marca"
                            >
                              <img
                                [src]="resolve(d.icon_url)"
                                alt=""
                                class="h-5 w-5 object-contain"
                                style="filter: invert(89%) sepia(47%) saturate(1206%) hue-rotate(22deg) brightness(105%) contrast(104%)"
                              />
                            </div>
                          }
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-bold text-slate-800">{{ d.name }}</div>
                      <div class="mt-0.5 max-w-sm text-xs leading-relaxed text-slate-500 line-clamp-2">
                        {{ d.description || 'Sin subtítulo' }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center font-medium text-slate-700">{{ d.sort_order }}</td>
                    <td class="px-6 py-4 text-center">
                      @if (d.show_in_home) {
                        <span
                          class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                        >
                          Sí
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          No
                        </span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (d.is_active) {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                        >
                          Activa
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
                        >
                          Inactiva
                        </span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer disabled:opacity-40"
                          title="Editar"
                          [disabled]="saving()"
                          (click)="openEdit(d)"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                            />
                          </svg>
                        </button>
                        @if (d.is_active) {
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 cursor-pointer disabled:opacity-40"
                            title="Desactivar"
                            [disabled]="saving()"
                            (click)="deactivate(d)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clip-rule="evenodd"
                              />
                            </svg>
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer disabled:opacity-40"
                            title="Activar"
                            [disabled]="saving()"
                            (click)="activate(d)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd"
                              />
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
                        Cargando disciplinas...
                      } @else {
                        No se encontraron disciplinas configuradas
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      @if (modalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            class="relative flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            @if (saving() || uploading()) {
              <div
                class="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm"
                role="status"
              >
                <div class="flex flex-col items-center gap-3">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <span class="text-sm font-medium text-slate-500">
                    {{ uploading() ? 'Subiendo archivo...' : 'Guardando...' }}
                  </span>
                </div>
              </div>
            }

            <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3">
              <h2 class="text-xl font-bold text-slate-900">
                {{ editingId() != null ? 'Editar disciplina #' + editingId() : 'Nueva disciplina' }}
              </h2>
              <button
                type="button"
                class="cursor-pointer text-slate-400 hover:text-slate-600 disabled:opacity-40"
                [disabled]="saving() || uploading()"
                (click)="closeModal()"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form class="flex flex-col gap-4" (ngSubmit)="save()">
              <div class="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 class="text-sm font-bold text-slate-700">Contenido</h3>
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    required
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    [(ngModel)]="form.name"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
                    >Subtítulo / descripción</label
                  >
                  <textarea
                    name="description"
                    rows="2"
                    placeholder="Ej. Entrenamiento"
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    [(ngModel)]="form.description"
                  ></textarea>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Imagen</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  class="w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
                  [disabled]="uploading() || saving()"
                  (change)="onUpload($event, 'image')"
                />
                <div class="relative mt-3 min-h-[6rem] max-w-xs">
                  @if (uploading() && !form.image_url) {
                    <div
                      class="flex h-24 items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40"
                    >
                      <span class="text-xs font-medium text-indigo-600">Procesando imagen...</span>
                    </div>
                  } @else if (form.image_url) {
                    <img
                      [src]="resolve(form.image_url)"
                      alt="Vista previa"
                      class="h-24 w-full rounded-xl object-cover ring-1 ring-slate-200"
                    />
                  }
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Icono SVG</label>
                <input
                  type="file"
                  accept="image/svg+xml,.svg,image/png,image/webp,image/jpeg"
                  class="w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
                  [disabled]="uploading() || saving()"
                  (change)="onUpload($event, 'icon')"
                />
                <p class="mt-1 text-[11px] text-slate-500">Preferible SVG. Se guarda en disciplines_svgs.</p>
                <div class="relative mt-3 min-h-[4rem] max-w-xs">
                  @if (form.icon_url) {
                    <div class="flex h-20 w-20 items-center justify-center rounded-xl bg-[#0b120c] ring-1 ring-slate-200">
                      <img
                        [src]="resolve(form.icon_url)"
                        alt="Icono"
                        class="h-12 w-12 object-contain"
                        style="filter: invert(89%) sepia(47%) saturate(1206%) hue-rotate(22deg) brightness(105%) contrast(104%)"
                      />
                    </div>
                  }
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Orden</label>
                  <input
                    name="sort_order"
                    type="number"
                    min="0"
                    required
                    class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    [(ngModel)]="form.sort_order"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Estado</label>
                  <select
                    name="is_active"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    [(ngModel)]="form.is_active"
                  >
                    <option [ngValue]="true">Activa</option>
                    <option [ngValue]="false">Inactiva</option>
                  </select>
                </div>
                <div class="col-span-2">
                  <div class="flex items-center gap-2">
                    <input
                      id="discipline-show-home"
                      name="show_in_home"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      [(ngModel)]="form.show_in_home"
                    />
                    <label for="discipline-show-home" class="text-sm font-medium text-slate-700"
                      >Mostrar en carrusel de Home</label
                    >
                  </div>
                </div>
              </div>

              <footer class="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  class="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  [disabled]="saving() || uploading()"
                  (click)="closeModal()"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  [disabled]="saving() || uploading()"
                >
                  @if (saving()) {
                    <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  }
                  {{ editingId() != null ? 'Guardar cambios' : 'Crear disciplina' }}
                </button>
              </footer>
            </form>
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
    this.error.set(null);
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
    this.error.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving() || this.uploading()) return;
    this.modalOpen.set(false);
  }

  onUpload(event: Event, kind: 'image' | 'icon'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
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
    const payload = {
      name,
      description: this.form.description.trim() || null,
      image_url: this.form.image_url || null,
      icon_url: this.form.icon_url || null,
      sort_order: this.form.sort_order,
      show_in_home: this.form.show_in_home,
      is_active: this.form.is_active,
    };
    if (id == null) {
      this.api.create(payload).subscribe({
        next: () => this.afterSave('Disciplina creada.'),
        error: (err) => {
          this.error.set(err?.error?.detail || 'No se pudo crear.');
          this.saving.set(false);
        },
      });
      return;
    }

    this.api.update(id, payload).subscribe({
      next: () => this.afterSave('Disciplina actualizada.'),
      error: (err) => {
        this.error.set(err?.error?.detail || 'No se pudo actualizar.');
        this.saving.set(false);
      },
    });
  }

  deactivate(d: DisciplineAdminItem): void {
    if (!confirm(`¿Desactivar "${d.name}"?`)) return;
    this.saving.set(true);
    this.api.deactivate(d.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Disciplina desactivada.');
        this.reload();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo desactivar.');
      },
    });
  }

  activate(d: DisciplineAdminItem): void {
    this.saving.set(true);
    this.api.update(d.id, { is_active: true }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Disciplina activada.');
        this.reload();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo activar.');
      },
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

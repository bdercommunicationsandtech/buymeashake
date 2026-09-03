import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/dashboard.service';
import { EditorSavePatch } from './editor-save-patch';

@Component({
  selector: 'app-page-copy-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        (click)="onBackdrop($event)"
      >
        <div
          class="bg-white dark:bg-[#121614] rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-gray-200/80 dark:border-white/10 shadow-2xl relative max-h-[92vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="close.emit()"
            class="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 grid place-items-center text-xs font-bold cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white pr-8">Título y descripción</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Este copy aparece a la izquierda del hero en tu página pública.
          </p>

          @if (error()) {
            <p class="mt-3 text-xs font-bold text-red-500">{{ error() }}</p>
          }

          <label class="mt-5 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Título de tu página
          </label>
          <textarea
            rows="3"
            maxlength="200"
            placeholder="Fuerza&#10;Disciplina&#10;Propósito"
            class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
            [value]="title()"
            (input)="title.set($any($event.target).value)"
          ></textarea>
          <p class="mt-1 text-[11px] text-gray-400">Usa un salto de línea por cada renglón del título.</p>

          <label class="mt-4 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Descripción de tu página
          </label>
          <textarea
            rows="4"
            maxlength="2000"
            placeholder="Cuéntale a tus fans de qué trata tu página..."
            class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
            [value]="description()"
            (input)="description.set($any($event.target).value)"
          ></textarea>

          <button
            type="button"
            (click)="save()"
            [disabled]="saving()"
            class="mt-5 w-full rounded-2xl bg-[#c9ff3d] py-3.5 text-sm font-black text-gray-950 disabled:opacity-50 cursor-pointer"
          >
            {{ saving() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class PageCopyModalComponent {
  readonly open = input(false);
  readonly close = output<void>();
  readonly saved = output<EditorSavePatch>();

  private readonly dashboard = inject(DashboardService);

  readonly title = signal('');
  readonly description = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.dashboard.getProfile().subscribe({
        next: (p) => {
          this.title.set(p.page_title || '');
          this.description.set(p.page_description || '');
        },
        error: () => this.error.set('No se pudo cargar el perfil.'),
      });
    });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.dashboard
      .updateProfile({
        page_title: this.title().trim() || null,
        page_description: this.description().trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit({
            pageTitle: this.title().trim() || null,
            pageDescription: this.description().trim() || null,
          });
          this.close.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error?.message || 'Error al guardar.');
        },
      });
  }
}

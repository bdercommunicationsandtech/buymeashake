import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/dashboard.service';
import { EditorSavePatch } from './editor-save-patch';

@Component({
  selector: 'app-goal-editor-modal',
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
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white pr-8">Meta deportiva</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            {{ editingId() ? 'Edita la meta activa en tu perfil público.' : 'Crea la meta que verán tus fans.' }}
          </p>

          @if (error()) {
            <p class="mt-3 text-xs font-bold text-red-500">{{ error() }}</p>
          }

          <div class="mt-5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Imagen de la meta
            </label>
            <p class="text-[11px] text-gray-400 mb-2">Portada de la tarjeta. Independiente del banner del hero.</p>
            <div class="flex items-center gap-4">
              <div class="h-20 w-28 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 shrink-0">
                @if (coverUrl()) {
                  <img [src]="coverUrl()" alt="Meta" class="h-full w-full object-cover" />
                } @else {
                  <div class="h-full w-full grid place-items-center text-gray-400 text-[10px] font-bold">Sin imagen</div>
                }
              </div>
              <div class="flex flex-col gap-2">
                <label class="inline-block rounded-xl border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  {{ uploading() ? 'Subiendo...' : 'Subir imagen' }}
                  <input type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" [disabled]="uploading()" />
                </label>
                @if (coverUrl()) {
                  <button type="button" (click)="coverUrl.set(null)" class="text-xs font-bold text-red-500 cursor-pointer text-left">
                    Quitar imagen
                  </button>
                }
              </div>
            </div>
          </div>

          <label class="mt-5 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Título de la meta
          </label>
          <input
            type="text"
            maxlength="200"
            placeholder="Ej. Campeonato Panamericano 2026"
            class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
            [value]="title()"
            (input)="title.set($any($event.target).value)"
          />

          <label class="mt-4 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Monto objetivo (USD)
          </label>
          <input
            type="number"
            min="10"
            class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
            [value]="target()"
            (input)="target.set(+$any($event.target).value)"
          />

          <button
            type="button"
            (click)="save()"
            [disabled]="saving() || title().trim().length < 3 || target() <= 0"
            class="mt-5 w-full rounded-2xl bg-[#c9ff3d] py-3.5 text-sm font-black text-gray-950 disabled:opacity-50 cursor-pointer"
          >
            {{ saving() ? 'Guardando…' : editingId() ? 'Actualizar meta' : 'Activar meta' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class GoalEditorModalComponent {
  readonly open = input(false);
  readonly close = output<void>();
  readonly saved = output<EditorSavePatch>();

  private readonly dashboard = inject(DashboardService);

  readonly editingId = signal<number | null>(null);
  readonly title = signal('');
  readonly target = signal(1000);
  readonly coverUrl = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.dashboard.getGoals().subscribe({
        next: (goals) => {
          const active = goals.find((g) => g.is_active);
          if (active) {
            this.editingId.set(active.id);
            this.title.set(active.title);
            this.target.set(Number(active.target_amount) || 1000);
            this.coverUrl.set(active.cover_image_url || null);
          } else {
            this.editingId.set(null);
            this.title.set('');
            this.target.set(1000);
            this.coverUrl.set(null);
          }
        },
        error: () => this.error.set('No se pudieron cargar las metas.'),
      });
    });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploading.set(true);
    this.dashboard.uploadImage(input.files[0]).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.coverUrl.set(res.url);
      },
      error: () => {
        this.uploading.set(false);
        this.error.set('Error al subir la imagen.');
      },
    });
  }

  save(): void {
    const title = this.title().trim();
    const target = this.target();
    if (title.length < 3 || target <= 0) return;

    this.saving.set(true);
    this.error.set(null);
    const id = this.editingId();
    const cover = this.coverUrl();

    const req = id
      ? this.dashboard.updateGoal(id, {
          title,
          target_amount: target,
          is_active: true,
          cover_image_url: cover,
        })
      : this.dashboard.createGoal({
          title,
          target_amount: target,
          currency: 'USD',
          cover_image_url: cover,
        });

    req.subscribe({
      next: (goal) => {
        this.saving.set(false);
        this.saved.emit({
          goalTitle: goal.title,
          goalTarget: Number(goal.target_amount) || target,
          goalRaised: Number(goal.raised_amount) || 0,
          goalCoverImageUrl: goal.cover_image_url ?? cover,
        });
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error?.message || 'Error al guardar la meta.');
      },
    });
  }
}

import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/dashboard.service';
import { EditorSavePatch } from './editor-save-patch';

@Component({
  selector: 'app-prices-modal',
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
          class="bg-white dark:bg-[#121614] rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-gray-200/80 dark:border-white/10 shadow-2xl relative"
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
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white pr-8">Moneda &amp; Precios</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Precio base de cada shake en tu página pública.
          </p>

          @if (error()) {
            <p class="mt-3 text-xs font-bold text-red-500">{{ error() }}</p>
          }

          <label class="mt-5 block text-sm font-black text-gray-900 dark:text-white">Precio de 1 Shake</label>
          <div class="mt-3 flex items-center gap-3">
            <span class="text-lg font-black text-gray-900 dark:text-white">$</span>
            <input
              type="number"
              min="1"
              max="100"
              class="w-32 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
              [value]="shakePrice()"
              (input)="shakePrice.set(+$any($event.target).value)"
            />
            <span class="text-sm font-bold text-gray-500">{{ currency() }}</span>
          </div>

          <label class="mt-5 block text-sm font-black text-gray-900 dark:text-white">Moneda de Cobro</label>
          <select
            class="mt-3 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
            [value]="currency()"
            (change)="currency.set($any($event.target).value)"
          >
            <option value="USD">Dólares Americanos (USD - $)</option>
          </select>

          <button
            type="button"
            (click)="save()"
            [disabled]="saving() || shakePrice() < 1"
            class="mt-6 w-full rounded-2xl bg-[#c9ff3d] py-3.5 text-sm font-black text-gray-950 disabled:opacity-50 cursor-pointer"
          >
            {{ saving() ? 'Guardando…' : 'Guardar ajustes' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class PricesModalComponent {
  readonly open = input(false);
  readonly close = output<void>();
  readonly saved = output<EditorSavePatch>();

  private readonly dashboard = inject(DashboardService);

  readonly shakePrice = signal(3);
  readonly currency = signal<'USD'>('USD');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.dashboard.getProfile().subscribe({
        next: (p) => {
          this.shakePrice.set(Number(p.shake_price) || 3);
          this.currency.set('USD');
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
        shake_price: this.shakePrice(),
        currency: this.currency(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit({ shakePrice: this.shakePrice() });
          this.close.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error?.message || 'Error al guardar.');
        },
      });
  }
}

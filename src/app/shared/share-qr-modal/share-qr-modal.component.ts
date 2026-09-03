import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  downloadDataUrl,
  renderShareCardPng,
  type QrVariant,
} from '../utils/qrcode';

@Component({
  selector: 'app-share-qr-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-qr-title"
        (click)="onBackdrop($event)"
      >
        <div
          class="bg-white dark:bg-[#121614] rounded-3xl p-5 sm:p-7 max-w-md w-full border border-gray-200/80 dark:border-white/10 shadow-2xl relative max-h-[92vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="close.emit()"
            class="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white grid place-items-center text-xs font-bold transition cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div class="pr-8">
            <h3
              id="share-qr-title"
              class="font-display text-xl font-black text-gray-950 dark:text-white"
            >
              Compartir página
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Elige el diseño de tu QR y descárgalo para redes o imprimir.
            </p>
          </div>

          <div
            class="mt-5 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10"
            role="tablist"
            aria-label="Diseño del QR"
          >
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="variant() === 'light'"
              (click)="variant.set('light')"
              class="rounded-xl py-2.5 text-xs font-black transition cursor-pointer"
              [class.bg-white]="variant() === 'light'"
              [class.dark:bg-[#1a1f1c]]="variant() === 'light'"
              [class.text-gray-950]="variant() === 'light'"
              [class.dark:text-white]="variant() === 'light'"
              [class.shadow-xs]="variant() === 'light'"
              [class.text-gray-500]="variant() !== 'light'"
            >
              Blanco
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="variant() === 'dark'"
              (click)="variant.set('dark')"
              class="rounded-xl py-2.5 text-xs font-black transition cursor-pointer"
              [class.bg-white]="variant() === 'dark'"
              [class.dark:bg-[#1a1f1c]]="variant() === 'dark'"
              [class.text-gray-950]="variant() === 'dark'"
              [class.dark:text-white]="variant() === 'dark'"
              [class.shadow-xs]="variant() === 'dark'"
              [class.text-gray-500]="variant() !== 'dark'"
            >
              Negro
            </button>
          </div>

          <div class="mt-5 flex justify-center">
            @if (previewUrl(); as preview) {
              <img
                [src]="preview"
                [alt]="'QR de ' + displayPath()"
                class="w-full max-w-[280px] rounded-[1.75rem] shadow-lg border border-gray-200/60 dark:border-white/10"
              />
            } @else {
              <div
                class="w-full max-w-[280px] aspect-[100/128] rounded-[1.75rem] bg-gray-100 dark:bg-white/5 grid place-items-center text-xs font-bold text-gray-400"
              >
                No se pudo generar el QR
              </div>
            }
          </div>

          <p class="mt-3 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
            {{ displayPath() }}
          </p>

          <div class="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              (click)="download()"
              [disabled]="!previewUrl() || downloading()"
              class="w-full rounded-2xl bg-[#c9ff3d] hover:bg-[#bbf033] py-3.5 text-xs sm:text-sm font-black text-gray-950 shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"/>
              </svg>
              {{ downloading() ? 'Descargando…' : 'Descargar QR' }}
            </button>

            <button
              type="button"
              (click)="copyLink()"
              class="w-full rounded-2xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 py-3.5 text-xs sm:text-sm font-black transition hover:opacity-90 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
              </svg>
              {{ linkCopied() ? '¡Link copiado!' : 'Copiar link' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ShareQrModalComponent {
  readonly open = input(false);
  readonly handle = input('...');
  readonly close = output<void>();

  readonly variant = signal<QrVariant>('light');
  readonly downloading = signal(false);
  readonly linkCopied = signal(false);

  readonly profileUrl = computed(() => `https://buymeashake.fit/${this.handle()}`);
  readonly displayPath = computed(() => `buymeashake.fit/${this.handle()}`);

  readonly previewUrl = computed(() => {
    if (!this.open()) return null;
    try {
      return renderShareCardPng({
        profileUrl: this.profileUrl(),
        displayPath: this.displayPath(),
        variant: this.variant(),
        width: 720,
      });
    } catch {
      return null;
    }
  });

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  download(): void {
    if (!this.previewUrl()) return;
    this.downloading.set(true);
    try {
      const hiRes = renderShareCardPng({
        profileUrl: this.profileUrl(),
        displayPath: this.displayPath(),
        variant: this.variant(),
        width: 1200,
      });
      const theme = this.variant() === 'light' ? 'blanco' : 'negro';
      downloadDataUrl(hiRes, `buymeashake-${this.handle()}-qr-${theme}.png`);
    } finally {
      this.downloading.set(false);
    }
  }

  copyLink(): void {
    navigator.clipboard?.writeText(this.profileUrl());
    this.linkCopied.set(true);
    setTimeout(() => this.linkCopied.set(false), 2200);
  }
}

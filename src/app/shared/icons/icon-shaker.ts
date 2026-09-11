import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type IconShakerTone = 'auto' | 'black' | 'muted' | 'white' | 'lime' | 'amber';

/**
 * Official bshake mark. The source SVG is black; tones are applied with CSS filters
 * so it can read as gray, white, lime, etc. (CSS mask does not work with this asset).
 *
 * `muted` stays dark-gray on light backgrounds and inverts only under `.dark`
 * so icons remain visible on light cards (e.g. ranking #2 / #3).
 */
@Component({
  selector: 'app-icon-shaker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex leading-none shrink-0' },
  styles: [
    `
      :host-context(.group:hover) img.hover-to-black {
        filter: none !important;
        opacity: 1 !important;
      }

      img.tone-muted {
        filter: none;
        opacity: 0.55;
      }

      :host-context(html.dark) img.tone-muted,
      :host-context(.dark) img.tone-muted {
        filter: invert(1);
        opacity: 0.75;
      }

      img.tone-white {
        filter: invert(1);
      }
    `,
  ],
  template: `
    <img
      src="/logos/bshake-logo.svg"
      alt=""
      decoding="async"
      draggable="false"
      [attr.width]="numericSize"
      [attr.height]="numericSize"
      class="object-contain select-none"
      [class]="imgClass"
      [style.filter]="filterCss"
      [style.opacity]="opacityCss"
    />
  `,
})
export class IconShakerComponent {
  @Input() size: number | string = 24;
  /** Kept for API compatibility. */
  @Input() viewBox: string = '0 0 24 24';
  /** Layout / hover utilities. Color tokens in here are read when tone is `auto`. */
  @Input() customClass: string = '';
  /** Explicit tone; `auto` infers from customClass text-* tokens. */
  @Input() tone: IconShakerTone = 'auto';

  get numericSize(): number {
    if (typeof this.size === 'number') return this.size;
    const n = parseFloat(this.size);
    return Number.isFinite(n) ? n : 24;
  }

  get imgClass(): string {
    const layout = this.customClass
      .split(/\s+/)
      .filter(
        (c) =>
          c &&
          !c.startsWith('text-') &&
          !c.startsWith('group-hover:text-') &&
          !c.startsWith('dark:text-'),
      )
      .join(' ');
    const hover = /group-hover:text-gray-950|group-hover:text-black/.test(this.customClass)
      ? 'hover-to-black'
      : '';
    const toneClass =
      this.resolvedTone === 'muted'
        ? 'tone-muted'
        : this.resolvedTone === 'white'
          ? 'tone-white'
          : '';
    return [layout, hover, toneClass].filter(Boolean).join(' ');
  }

  private get resolvedTone(): Exclude<IconShakerTone, 'auto'> {
    if (this.tone !== 'auto') return this.tone;
    const c = this.customClass;
    if (/text-\[#ccff00\]|text-\[#c9ff3d\]|text-lime/.test(c)) return 'lime';
    if (/text-amber/.test(c)) return 'amber';
    if (/text-white(?:\/|\b)/.test(c) && !/text-white\//.test(c)) return 'white';
    if (/text-white\//.test(c)) return 'muted';
    if (/text-slate-|text-gray-[3-6]/.test(c)) return 'muted';
    return 'black';
  }

  get filterCss(): string | null {
    switch (this.resolvedTone) {
      case 'white':
      case 'muted':
        // Handled by CSS classes so muted can differ in light vs dark.
        return null;
      case 'lime':
        return 'invert(89%) sepia(47%) saturate(1206%) hue-rotate(22deg) brightness(105%) contrast(104%)';
      case 'amber':
        return 'invert(66%) sepia(58%) saturate(1200%) hue-rotate(1deg) brightness(100%) contrast(95%)';
      case 'black':
      default:
        return 'none';
    }
  }

  get opacityCss(): number | null {
    const c = this.customClass;
    if (this.resolvedTone === 'muted') {
      // Base opacity overridden by CSS; keep slight tweaks when requested.
      if (/text-white\/70|opacity-70/.test(c)) return 0.7;
      if (/text-slate-400|text-gray-400/.test(c)) return null;
      if (/text-slate-300|text-gray-300/.test(c)) return null;
      if (/text-gray-600|text-gray-500/.test(c)) return null;
      return null;
    }
    return null;
  }
}

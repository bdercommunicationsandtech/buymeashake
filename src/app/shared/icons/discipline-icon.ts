import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

/**
 * Renders a discipline icon in brand lime (#ccff00).
 * SVGs are fetched and inlined so strokes use currentColor;
 * raster icons fall back to a CSS filter (same as app-icon-shaker).
 */
@Component({
  selector: 'app-discipline-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center justify-center shrink-0 leading-none text-[#ccff00]',
    '[style.width.px]': 'numericSize',
    '[style.height.px]': 'numericSize',
  },
  styles: [
    `
      :host ::ng-deep svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
      }
    `,
  ],
  template: `
    @if (safeSvg()) {
      <span class="block h-full w-full text-[#ccff00]" [innerHTML]="safeSvg()"></span>
    } @else if (rasterSrc()) {
      <img
        [src]="rasterSrc()!"
        alt=""
        decoding="async"
        class="h-full w-full object-contain select-none"
        [style.filter]="limeFilter"
      />
    }
  `,
})
export class DisciplineIconComponent implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private loadSeq = 0;

  @Input() src: string | null | undefined;
  @Input() size: number | string = 16;

  readonly safeSvg = signal<SafeHtml | null>(null);
  readonly rasterSrc = signal<string | null>(null);

  readonly limeFilter =
    'invert(89%) sepia(47%) saturate(1206%) hue-rotate(22deg) brightness(105%) contrast(104%)';

  get numericSize(): number {
    if (typeof this.size === 'number') return this.size;
    const n = parseFloat(this.size);
    return Number.isFinite(n) ? n : 16;
  }

  ngOnChanges(): void {
    this.safeSvg.set(null);
    this.rasterSrc.set(null);
    const raw = (this.src || '').trim();
    if (!raw) return;

    const fetchUrl = this.toFetchUrl(raw);
    const absolute = resolveMediaUrl(raw) || fetchUrl;
    const isSvg = /\.svg(\?|#|$)/i.test(fetchUrl) || fetchUrl.includes('disciplines_svgs');

    if (!isSvg) {
      this.rasterSrc.set(absolute);
      return;
    }

    const seq = ++this.loadSeq;
    this.http.get(fetchUrl, { responseType: 'text' }).subscribe({
      next: (text) => {
        if (seq !== this.loadSeq) return;
        const cleaned = this.prepareSvg(text);
        if (!cleaned) {
          this.rasterSrc.set(absolute);
          return;
        }
        this.safeSvg.set(this.sanitizer.bypassSecurityTrustHtml(cleaned));
      },
      error: () => {
        if (seq !== this.loadSeq) return;
        // Fallback: absolute URL + lime filter if proxy fetch fails
        this.rasterSrc.set(absolute);
      },
    });
  }

  /** Prefer same-origin /static so the Angular proxy serves the file. */
  private toFetchUrl(url: string): string {
    if (url.startsWith('/static/')) return url;
    if (/^https?:/i.test(url)) {
      try {
        const path = new URL(url).pathname;
        if (path.startsWith('/static/')) return path;
      } catch {
        /* ignore */
      }
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  }

  private prepareSvg(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed.toLowerCase().includes('<svg')) return null;

    let svg = trimmed
      .replace(/<\?xml[^>]*>/i, '')
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '');

    svg = svg.replace(/stroke\s*:\s*#0{3,6}\b/gi, 'stroke:currentColor');
    svg = svg.replace(/fill\s*:\s*#0{3,6}\b/gi, 'fill:currentColor');
    svg = svg.replace(/stroke\s*:\s*black\b/gi, 'stroke:currentColor');
    svg = svg.replace(/fill\s*:\s*black\b/gi, 'fill:currentColor');
    svg = svg.replace(/stroke=(["'])#0{3,6}\1/gi, 'stroke=$1currentColor$1');
    svg = svg.replace(/fill=(["'])#0{3,6}\1/gi, 'fill=$1currentColor$1');
    svg = svg.replace(/stroke=(["'])black\1/gi, 'stroke=$1currentColor$1');
    svg = svg.replace(/fill=(["'])black\1/gi, 'fill=$1currentColor$1');

    // Force monochrome iconography to inherit host text color (brand lime)
    if (/<style[\s>]/i.test(svg)) {
      svg = svg.replace(
        /(<style\b[^>]*>)/i,
        '$1\npath,line,circle,polyline,polygon,rect,ellipse{stroke:currentColor!important;}\n',
      );
    } else {
      svg = svg.replace(
        /<svg\b[^>]*>/i,
        (tag) =>
          `${tag}<style>path,line,circle,polyline,polygon,rect,ellipse{stroke:currentColor!important;}</style>`,
      );
    }

    const openTag = svg.match(/<svg\b[^>]*>/i)?.[0];
    if (openTag && !/\s(?:width|height)\s*=/i.test(openTag)) {
      svg = svg.replace(/<svg\b/i, '<svg width="100%" height="100%"');
    }

    return svg;
  }
}

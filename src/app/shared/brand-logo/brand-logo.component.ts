import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService, AppTheme } from '../../core/theme.service';

export type BrandLogoTheme = 'auto' | AppTheme;
export type BrandLogoSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'contents' },
  template: `
    @if (link() !== null) {
      <a [routerLink]="link()!" [class]="rootClass()" (click)="navClick.emit()">
        @if (showIcon()) {
          <span [class]="iconBoxClass()">
            <img
              src="/logos/bshake-logo.svg"
              alt=""
              class="h-[72%] w-[72%] object-contain"
              decoding="async"
            />
          </span>
        }
        <img
          [src]="titleSrc()"
          alt="buymeashake.fit"
          [class]="titleImgClass()"
          decoding="async"
        />
      </a>
    } @else {
      <div [class]="rootClass()">
        @if (showIcon()) {
          <span [class]="iconBoxClass()">
            <img
              src="/logos/bshake-logo.svg"
              alt=""
              class="h-[72%] w-[72%] object-contain"
              decoding="async"
            />
          </span>
        }
        <img
          [src]="titleSrc()"
          alt="buymeashake.fit"
          [class]="titleImgClass()"
          decoding="async"
        />
      </div>
    }
  `,
})
export class BrandLogoComponent {
  private readonly theme = inject(ThemeService);

  /** Pass `null` to render without a link (footer, checkout card header). */
  readonly link = input<string | null>('/');
  readonly showIcon = input(true);
  readonly forceTheme = input<BrandLogoTheme>('auto');
  readonly size = input<BrandLogoSize>('md');
  readonly hideTitleOnMobile = input(false);
  readonly boxClass = input('');
  readonly titleClass = input('');
  readonly linkClass = input('');
  readonly navClick = output<void>();

  readonly titleSrc = computed(() => {
    const forced = this.forceTheme();
    const mode: AppTheme = forced === 'auto' ? this.theme.currentTheme() : forced;
    return mode === 'dark'
      ? '/logos/bshake-title-dark.svg'
      : '/logos/bshake-title-light.svg';
  });

  readonly rootClass = computed(() => {
    const base = 'flex min-w-0 items-center gap-2.5 shrink-0';
    const extra = this.linkClass();
    return extra ? `${base} ${extra}` : base;
  });

  readonly iconBoxClass = computed(() => {
    const sizeClass =
      this.size() === 'sm'
        ? 'h-8 w-8 sm:h-9 sm:w-9'
        : this.size() === 'lg'
          ? 'h-10 w-10'
          : 'h-9 w-9';
    const base = `grid shrink-0 place-items-center rounded-xl bg-[#c9ff3d] font-bold shadow-xs ${sizeClass}`;
    const extra = this.boxClass();
    return extra ? `${base} ${extra}` : base;
  });

  readonly titleImgClass = computed(() => {
    const sizeClass =
      this.size() === 'sm'
        ? 'h-4 sm:h-5'
        : this.size() === 'lg'
          ? 'h-7 sm:h-8'
          : 'h-5 sm:h-6';
    const base = `w-auto object-contain object-left ${sizeClass}`;
    const mobile = this.hideTitleOnMobile() ? ' hidden sm:block' : '';
    const extra = this.titleClass() ? ` ${this.titleClass()}` : '';
    return `${base}${mobile}${extra}`;
  });
}

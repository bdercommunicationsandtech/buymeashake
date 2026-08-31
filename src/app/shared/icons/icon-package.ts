import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-package',
  standalone: true,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.viewBox]="viewBox" [attr.width]="size" [attr.height]="size" fill="currentColor" aria-hidden="true" [class]="customClass">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 12.5L4.5 10.75v5.5L12 20.75l7.5-4.5v-5.5L12 14.5z"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPackageComponent {
  @Input() size: number | string = 20;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

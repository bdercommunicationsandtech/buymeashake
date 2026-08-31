import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-calendar',
  standalone: true,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.viewBox]="viewBox" [attr.width]="size" [attr.height]="size" fill="currentColor" aria-hidden="true" [class]="customClass">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconCalendarComponent {
  @Input() size: number | string = 20;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

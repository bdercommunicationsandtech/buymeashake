import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-star',
  standalone: true,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.viewBox]="viewBox" [attr.width]="size" [attr.height]="size" fill="currentColor" aria-hidden="true" [class]="customClass">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconStarComponent {
  @Input() size: number | string = 20;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-running',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="viewBox"
      [attr.width]="size"
      [attr.height]="size"
      fill="currentColor"
      aria-hidden="true"
      [class]="customClass"
    >
      <circle cx="13.5" cy="4" r="2" />
      <path d="M19 8.5l-4.5 1.5-2-3a2 2 0 0 0-2.8-.4l-4 3a1 1 0 0 0 1.2 1.6l3.1-2.3 1.5 2.1-3 5.5a1 1 0 0 0 .4 1.3l4.5 2.5a1 1 0 0 0 1-1.7l-3.5-2 2-3.6 2 2.1a1 1 0 0 0 1.4.1l4-3.5a1 1 0 0 0-1.3-1.6z" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconRunningComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

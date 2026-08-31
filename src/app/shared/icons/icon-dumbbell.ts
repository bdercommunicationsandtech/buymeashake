import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-dumbbell',
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
      <!-- Barra central e inclinación deportiva -->
      <path d="M6 5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-14zm-4 3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8zm7 3h6v2H9v-2zm6-6a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-14zm4 3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V8z" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconDumbbellComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-shaker',
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
      <!-- Cap / Tapa superior con pico -->
      <path d="M8 2h8a1 1 0 0 1 1 1v1H7V3a1 1 0 0 1 1-1z" />
      <path d="M6 5h12a1 1 0 0 1 1 1v1H5V6a1 1 0 0 1 1-1z" />
      <!-- Cuerpo del shaker cónico deportivo con marcas de medición -->
      <path d="M5.5 8h13l-1.35 12.2a2 2 0 0 1-1.99 1.8H8.84a2 2 0 0 1-1.99-1.8L5.5 8zm3.5 3.5a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H9zm0 3a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H9z" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconShakerComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

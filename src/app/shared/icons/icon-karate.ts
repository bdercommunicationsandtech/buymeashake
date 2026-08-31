import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-karate',
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
      <!-- Cabeza -->
      <circle cx="12" cy="4" r="2.2" />
      <!-- Cuerpo marcial / Gi de Karate con cinturón y postura de guardia dinámica -->
      <path d="M15 8.5L18.5 6l1 1.5-3.5 3v3h-2v-2.5L12 9.5l-2 1.5V13.5H8v-3l-3.5-3 1-1.5L9 8.5h6z" />
      <!-- Cinturón / Obi -->
      <path d="M9.5 13h5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-.75.75h-5A.75.75 0 0 1 9 14.75v-1a.75.75 0 0 1 .75-.75z" />
      <path d="M12.5 15.5l1.5 3h-1.5l-1-2h1z" />
      <!-- Piernas en postura de combate Kiba-dachi -->
      <path d="M10 16l-3 6h2l2-4.5 2 4.5h2l-3-6h-2z" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconKarateComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

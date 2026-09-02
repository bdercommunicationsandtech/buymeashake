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
      <!-- Tapa con boquilla abatible y argolla de transporte (Loop) -->
      <path d="M7 2.5C7 2.22 7.22 2 7.5 2H11C11.55 2 12 2.45 12 3V4H6.5C6.5 3.45 6.72 2.5 7 2.5Z" />
      <!-- Argolla circular de agarre lateral derecha -->
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M12.5 2.5C12.5 2.22 12.72 2 13 2C14.66 2 16 3.34 16 5C16 6.66 14.66 8 13 8C12.45 8 12 7.55 12 7C12 6.45 12.45 6 13 6C13.55 6 14 5.55 14 5C14 4.45 13.55 4 13 4H12.5V2.5Z"
      />
      <!-- Banda ancha de rosca de la tapa -->
      <rect x="4.5" y="4.5" width="13" height="3" rx="1" />
      
      <!-- Cuerpo del shaker cónico con onda de batido -->
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M5.5 8.5L6.9 19.8C7.05 21.05 8.1 22 9.35 22H12.65C13.9 22 14.95 21.05 15.1 19.8L16.5 8.5H5.5ZM7.6 14C8.8 13.2 10.4 13.2 11.6 14C12.8 14.8 14.2 14.6 14.8 14.2L14.4 17.5C14.3 18.3 13.6 19 12.8 19H9.2C8.4 19 7.7 18.3 7.6 17.5L7.6 14Z"
      />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconShakerComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

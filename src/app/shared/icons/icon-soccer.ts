import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-soccer',
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
      <!-- Balón de Fútbol sólido con pentágonos geométricos limpios -->
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3.2l2.35 1.71-.9 2.76h-2.9l-.9-2.76L12 5.2zm-4.72 2.6l1.24.9-1.12 3.44-2.8-.91A8.04 8.04 0 0 1 7.28 7.8zm9.44 0a8.04 8.04 0 0 1 2.68 3.43l-2.8.91-1.12-3.44 1.24-.9zM5.56 14.86l2.8-.91 1.82 2.5-1.45 2.5a8.03 8.03 0 0 1-3.17-4.09zm12.88 0a8.03 8.03 0 0 1-3.17 4.09l-1.45-2.5 1.82-2.5 2.8.91zM12 18.8l1.45-2.5h-2.9L12 18.8z" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconSoccerComponent {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-shaker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="viewBox()"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="currentColor"
      aria-hidden="true"
      [class]="customClass() + ' animated-shaker-svg'"
    >
      <g class="shaker-vessel">
        <!-- Boquilla y tapón flip abatible -->
        <path d="M7 2.5C7 2.2 7.2 2 7.5 2H11C11.5 2 12 2.4 12 3V4.5H6.5C6.5 3.5 6.7 2.5 7 2.5Z" />
        <!-- Aro / Argolla de transporte grande (referencia) -->
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.5 2.5C12.5 2.2 12.7 2 13 2C14.6 2 16 3.4 16 5C16 6.6 14.6 8 13 8C12.5 8 12 7.5 12 7C12 6.5 12.5 6 13 6C13.5 6 14 5.5 14 5C14 4.5 13.5 4 13 4H12.5V2.5Z"
        />
        <!-- Rosca ancha de la tapa -->
        <rect x="4.5" y="4.5" width="13" height="3" rx="1" />
        
        <!-- Vaso cónico de proteína -->
        <path
          d="M5.5 8.5H16.5L15.1 19.8C14.95 21.05 13.9 22 12.65 22H9.35C8.1 22 7.05 21.05 6.9 19.8L5.5 8.5Z"
          opacity="0.25"
        />

        <!-- Nivel de Proteína líquida con onda deportiva -->
        <path
          d="M6.1 13.5C7.5 12.5 9.5 12.5 11 13.5C12.5 14.5 14.5 14.2 15.8 13.8L15.1 19.8C14.95 21.05 13.9 22 12.65 22H9.35C8.1 22 7.05 21.05 6.9 19.8L6.1 13.5Z"
          class="shaker-liquid"
        />
        <!-- Burbuja efervescente que sube -->
        <circle cx="11" cy="17" r="1.1" fill="#090c0a" class="shaker-bubble" />
      </g>
    </svg>
  `,
  styles: [`
    @keyframes shaker-tilt-motion {
      0%, 100% {
        transform: rotate(-10deg) translateY(1px);
        transform-origin: 12px 14px;
      }
      50% {
        transform: rotate(10deg) translateY(-2px);
        transform-origin: 12px 14px;
      }
    }

    @keyframes bubble-float {
      0% {
        transform: translateY(2px);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-4px);
        opacity: 0;
      }
    }

    .shaker-vessel {
      animation: shaker-tilt-motion 0.75s ease-in-out infinite;
    }

    .shaker-bubble {
      animation: bubble-float 0.75s ease-in infinite;
    }

    :host:hover .shaker-vessel,
    .group:hover .shaker-vessel {
      animation-duration: 0.35s;
    }
  `],
})
export class AnimatedShakerComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

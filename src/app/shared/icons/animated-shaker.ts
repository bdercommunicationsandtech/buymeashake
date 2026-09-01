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
        <!-- Boquilla / Asa -->
        <rect x="10.5" y="2" width="3" height="2" rx="1" />
        <!-- Tapa principal ergonómica -->
        <path d="M7 4.5H17C17.55 4.5 18 4.95 18 5.5V7H6V5.5C6 4.95 6.45 4.5 7 4.5Z" />
        
        <!-- Vaso cónico de proteína -->
        <path
          d="M6.5 8H17.5L15.8 20.2C15.65 21.2 14.8 22 13.8 22H10.2C9.2 22 8.35 21.2 8.2 20.2L6.5 8Z"
          opacity="0.25"
        />

        <!-- Nivel de Proteína líquida sólida -->
        <path
          d="M7.6 13.5H16.4L15.8 20.2C15.65 21.2 14.8 22 13.8 22H10.2C9.2 22 8.35 21.2 8.2 20.2L7.6 13.5Z"
          class="shaker-liquid"
        />
        <!-- Burbuja efervescente -->
        <circle cx="12" cy="17" r="1" fill="#090c0a" class="shaker-bubble" />
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

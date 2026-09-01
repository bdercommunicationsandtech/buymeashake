import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-biceps',
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
      [class]="customClass() + ' animated-biceps-svg'"
    >
      <!-- Brazo base / Tríceps & Hombro (24x24 estándar) -->
      <path
        d="M3 18.5C3 15.5 5 12 8.5 12C11 12 12.8 13.2 14 15L12.5 18H5C3.9 18 3 18.2 3 18.5Z"
        opacity="0.3"
      />
      <!-- Bíceps que se bombea / flexiona -->
      <path
        d="M7.5 12C9 9 12 8.5 14.5 10.5C16.2 11.9 16.8 14 16 16.5C14.5 17.5 11.5 17 9.5 15.5L7.5 12Z"
        class="biceps-muscle"
      />
      <!-- Antebrazo articulado con Mancuerna -->
      <g class="forearm-arm">
        <path
          d="M13 16.5L19 12C19.8 11.4 21 11.8 21.2 12.8C21.3 13.4 21 14 20.4 14.4L15.5 18.5C14.5 19.2 13.2 18.8 12.8 17.8L13 16.5Z"
        />
        <!-- Mancuerna compacta en la mano -->
        <rect x="17" y="7" width="2" height="7" rx="0.8" />
        <rect x="15.5" y="6" width="5" height="1.8" rx="0.6" />
        <rect x="15.5" y="13.2" width="5" height="1.8" rx="0.6" />
      </g>
    </svg>
  `,
  styles: [`
    @keyframes bicep-flex {
      0%, 100% {
        transform: rotate(0deg);
        transform-origin: 13px 17px;
      }
      50% {
        transform: rotate(-32deg);
        transform-origin: 13px 17px;
      }
    }

    @keyframes muscle-grow {
      0%, 100% {
        transform: scale(1);
        transform-origin: 12px 13px;
        opacity: 0.85;
      }
      50% {
        transform: scale(1.18);
        transform-origin: 12px 13px;
        opacity: 1;
        filter: drop-shadow(0 0 2px currentColor);
      }
    }

    .forearm-arm {
      animation: bicep-flex 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .biceps-muscle {
      animation: muscle-grow 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    :host:hover .forearm-arm,
    .group:hover .forearm-arm {
      animation-duration: 0.8s;
    }

    :host:hover .biceps-muscle,
    .group:hover .biceps-muscle {
      animation-duration: 0.8s;
    }
  `],
})
export class AnimatedBicepsComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

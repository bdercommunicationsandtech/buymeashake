import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-boxing-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="viewBox()"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      aria-hidden="true"
      [class]="customClass() + ' animated-boxing-svg'"
    >
      <!-- Cuerdas colgantes -->
      <line x1="12" y1="2" x2="10" y2="7" stroke="currentColor" stroke-width="1.6" opacity="0.6" stroke-linecap="round" />
      <line x1="13.5" y1="2" x2="15" y2="7.5" stroke="currentColor" stroke-width="1.6" opacity="0.6" stroke-linecap="round" />

      <!-- Guantes de boxeo colgantes oscilantes -->
      <g class="boxing-gloves-swing" transform-origin="12 3">
        <!-- Guante izquierdo rojo -->
        <g transform="translate(0, 0)">
          <!-- Muñequera -->
          <rect x="7.5" y="7.5" width="5" height="3" rx="0.8" fill="#991b1b" stroke="currentColor" stroke-width="1.5" />
          <!-- Cabeza guante -->
          <path
            d="M 6.5,10.5 C 5,12 4.5,15 6,17.5 C 7.5,20 10.5,20.5 12,19 C 13,18 13.5,15 13,12 C 12.5,10.5 12,10.5 11,10.5 Z"
            fill="#ef4444"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <!-- Cordones blancos -->
          <line x1="8.5" y1="11.5" x2="10.5" y2="12.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
          <line x1="10.5" y1="11.5" x2="8.5" y2="12.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
        </g>

        <!-- Guante derecho rojo apoyado -->
        <g transform="rotate(18 14 9)">
          <rect x="12" y="7.5" width="4.8" height="2.8" rx="0.8" fill="#991b1b" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M 12.5,10.3 C 14.5,11.2 18,13 18,16.5 C 18,19.5 15,20.5 13,19.8 C 11.5,19 11.2,16 11.5,13.5 Z"
            fill="#dc2626"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <line x1="13" y1="11.5" x2="15" y2="12.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
        </g>
      </g>
    </svg>
  `,
  styles: [`
    @keyframes boxing-sway {
      0%, 100% {
        transform: rotate(-10deg);
      }
      50% {
        transform: rotate(10deg);
      }
    }

    .boxing-gloves-swing {
      animation: boxing-sway 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    }

    :host:hover .boxing-gloves-swing,
    .group:hover .boxing-gloves-swing {
      animation-duration: 0.7s;
    }
  `],
})
export class AnimatedBoxingIconComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

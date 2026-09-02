import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-soccer',
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
      [class]="customClass() + ' animated-soccer-svg'"
    >
      <g class="soccer-ball-group" transform-origin="12 12">
        <!-- Esfera base del balón -->
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="#ffffff"
          stroke="currentColor"
          stroke-width="2"
        />

        <!-- Pentágono central negro clásico -->
        <polygon
          points="12,8.5 14.8,10.6 13.7,14 10.3,14 9.2,10.6"
          fill="currentColor"
        />

        <!-- Costuras hacia los bordes -->
        <!-- Arriba -->
        <line x1="12" y1="8.5" x2="12" y2="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <!-- Arriba derecha -->
        <line x1="14.8" y1="10.6" x2="19" y2="9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <!-- Abajo derecha -->
        <line x1="13.7" y1="14" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <!-- Abajo izquierda -->
        <line x1="10.3" y1="14" x2="6.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <!-- Arriba izquierda -->
        <line x1="9.2" y1="10.6" x2="5" y2="9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />

        <!-- Parches de borde oscuros -->
        <path d="M9.5 3.5 C11 2.8 13 2.8 14.5 3.5 Z" fill="currentColor" />
        <path d="M19.5 7.5 C20.5 9 21 11 21 12.5 Z" fill="currentColor" />
        <path d="M4.5 7.5 C3.5 9 3 11 3 12.5 Z" fill="currentColor" />
      </g>
    </svg>
  `,
  styles: [`
    @keyframes soccer-spin-bounce {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
      }
      50% {
        transform: translateY(-3px) rotate(35deg) scale(1.05);
      }
    }

    .soccer-ball-group {
      animation: soccer-spin-bounce 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    :host:hover .soccer-ball-group,
    .group:hover .soccer-ball-group {
      animation-duration: 0.5s;
    }
  `],
})
export class AnimatedSoccerComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

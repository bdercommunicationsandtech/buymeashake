import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-dumbbell',
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
      [class]="customClass() + ' animated-dumbbell-svg'"
    >
      <g class="dumbbell-group" transform-origin="12 12">
        <!-- Barra central de agarre con moleteado -->
        <rect
          x="6"
          y="10.5"
          width="12"
          height="3"
          rx="1"
          fill="currentColor"
        />

        <!-- DISCOS IZQUIERDOS (Píldoras redondeadas con borde grueso estilo referencia) -->
        <!-- Disco interior izquierdo -->
        <rect
          x="5"
          y="5.5"
          width="3.2"
          height="13"
          rx="1.6"
          fill="#ffffff"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <!-- Disco exterior izquierdo -->
        <rect
          x="2"
          y="7"
          width="3.2"
          height="10"
          rx="1.6"
          fill="#ffffff"
          stroke="currentColor"
          stroke-width="1.8"
        />

        <!-- DISCOS DERECHOS -->
        <!-- Disco interior derecho -->
        <rect
          x="15.8"
          y="5.5"
          width="3.2"
          height="13"
          rx="1.6"
          fill="#ffffff"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <!-- Disco exterior derecho -->
        <rect
          x="18.8"
          y="7"
          width="3.2"
          height="10"
          rx="1.6"
          fill="#ffffff"
          stroke="currentColor"
          stroke-width="1.8"
        />
      </g>
    </svg>
  `,
  styles: [`
    @keyframes dumbbell-curl {
      0%, 100% {
        transform: rotate(0deg) translateY(0);
      }
      50% {
        transform: rotate(-18deg) translateY(-2px) scale(1.08);
      }
    }

    .dumbbell-group {
      animation: dumbbell-curl 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    :host:hover .dumbbell-group,
    .group:hover .dumbbell-group {
      animation-duration: 0.6s;
    }
  `],
})
export class AnimatedDumbbellComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

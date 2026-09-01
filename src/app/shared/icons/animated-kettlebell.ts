import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-kettlebell',
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
      [class]="customClass() + ' animated-kettlebell-svg'"
    >
      <!-- Kettlebell Swing estructurado en 24x24 sólido -->
      <g class="kettle-swing-group">
        <!-- Asa superior del Kettlebell -->
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8.5 4C6.567 4 5 5.567 5 7.5V11.2C6.01 10.45 7.2 9.9 8.5 9.6V7.5C8.5 6.948 8.948 6.5 9.5 6.5H14.5C15.052 6.5 15.5 6.948 15.5 7.5V9.6C16.8 9.9 17.99 10.45 19 11.2V7.5C19 5.567 17.433 4 15.5 4H8.5Z"
        />
        <!-- Esfera sólida de la pesa -->
        <circle cx="12" cy="15" r="6.5" />
        <!-- Núcleo de contraste -->
        <circle cx="12" cy="15" r="2.2" fill="#090c0a" />
      </g>
    </svg>
  `,
  styles: [`
    @keyframes kettle-swing {
      0%, 100% {
        transform: rotate(-24deg);
        transform-origin: 12px 5px;
      }
      50% {
        transform: rotate(24deg);
        transform-origin: 12px 5px;
      }
    }

    .kettle-swing-group {
      animation: kettle-swing 1.3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    }

    :host:hover .kettle-swing-group,
    .group:hover .kettle-swing-group {
      animation-duration: 0.65s;
    }
  `],
})
export class AnimatedKettlebellComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

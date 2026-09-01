import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-runner',
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
      [class]="customClass() + ' animated-runner-svg'"
    >
      <!-- Atleta Corredor Silueta Sólida 24x24 -->
      <g class="runner-bob">
        <!-- Cabeza -->
        <circle cx="15.5" cy="4.5" r="2.5" />
        
        <!-- Torso con inclinación atlética -->
        <path d="M14.5 7.5L11.5 13.5L9.5 12.8L12.2 7.2C12.8 6.8 13.8 6.8 14.5 7.5Z" />

        <!-- Brazo Delantero -->
        <path d="M13.5 8.5L18 10.5L16.5 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" class="runner-arm-front" />
        
        <!-- Brazo Trasero -->
        <path d="M12.5 9L8.5 10.5L7 8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.4" class="runner-arm-back" />

        <!-- Pierna Delantera -->
        <path d="M11.5 13.5L16 16.5L15 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" class="runner-leg-front" />

        <!-- Pierna Trasera -->
        <path d="M11.5 13.5L6.5 16L4 14.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.4" class="runner-leg-back" />
      </g>

      <!-- Suelo / Estela de velocidad -->
      <line x1="3" y1="22.5" x2="21" y2="22.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 2" class="runner-ground" />
    </svg>
  `,
  styles: [`
    @keyframes runner-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-1.2px); }
    }

    @keyframes leg-stride-front {
      0%, 100% {
        transform: rotate(-28deg);
        transform-origin: 11.5px 13.5px;
      }
      50% {
        transform: rotate(28deg);
        transform-origin: 11.5px 13.5px;
      }
    }

    @keyframes leg-stride-back {
      0%, 100% {
        transform: rotate(28deg);
        transform-origin: 11.5px 13.5px;
      }
      50% {
        transform: rotate(-28deg);
        transform-origin: 11.5px 13.5px;
      }
    }

    @keyframes ground-flow-dash {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -10; }
    }

    .runner-bob {
      animation: runner-bounce 0.5s ease-in-out infinite;
    }
    .runner-leg-front {
      animation: leg-stride-front 0.5s ease-in-out infinite;
    }
    .runner-leg-back {
      animation: leg-stride-back 0.5s ease-in-out infinite;
    }
    .runner-arm-front {
      animation: leg-stride-back 0.5s ease-in-out infinite;
    }
    .runner-arm-back {
      animation: leg-stride-front 0.5s ease-in-out infinite;
    }
    .runner-ground {
      animation: ground-flow-dash 0.4s linear infinite;
    }

    :host:hover .runner-bob,
    .group:hover .runner-bob {
      animation-duration: 0.28s;
    }
  `],
})
export class AnimatedRunnerComponent {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');
}

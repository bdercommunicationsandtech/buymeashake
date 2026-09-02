import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { FITNESS_FIGURES, ShakerInteraction } from './shaker-interaction';
import { ShakerScene } from './shaker-scene';

@Component({
  selector: 'app-shaker-3d',
  standalone: true,
  imports: [NgtCanvas, ShakerScene],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .stage {
      position: relative;
      width: 100%;
      height: 340px;
      overflow: hidden;
      border-radius: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #090c0a;
      isolation: isolate;
      contain: paint;
      touch-action: none;
      user-select: none;
      cursor: grab;
    }

    .stage:active {
      cursor: grabbing;
    }

    @media (min-width: 640px) {
      .stage {
        height: 400px;
      }
    }

    .stage ngt-canvas,
    .stage ::ng-deep canvas {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
    }

    .chips {
      pointer-events: auto;
      position: absolute;
      top: 0.85rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.4rem;
      padding: 0.25rem;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
    }

    .chip {
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }

    .chip:hover {
      color: #fff;
    }

    .chip.is-active {
      background: #c9ff3d;
      color: #090c0a;
    }

    .hint {
      pointer-events: none;
      position: absolute;
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.45);
    }

    .hint strong {
      color: #c9ff3d;
      font-weight: 700;
    }
  `,
  template: `
    <div
      class="stage"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
    >
      <ngt-canvas
        class="pointer-events-none"
        [shadows]="false"
        [dpr]="[1, 1.5]"
        [camera]="{ position: [0, 0.2, 4.8], fov: 34 }"
        [gl]="{ antialias: true, alpha: false }"
      >
        <app-shaker-scene *canvasContent />
      </ngt-canvas>

      <div class="chips" (pointerdown)="$event.stopPropagation()">
        @for (opt of figures; track opt.id) {
          <button
            type="button"
            class="chip"
            [class.is-active]="interaction.figure() === opt.id"
            (click)="interaction.setFigure(opt.id)"
          >
            {{ opt.label }}
          </button>
        }
      </div>

      <p class="hint">
        @if (interaction.dragging()) {
          <strong>Girando</strong>
        } @else {
          {{ hintForFigure() }}
        }
      </p>
    </div>
  `,
})
export class Shaker3d {
  readonly interaction = inject(ShakerInteraction);
  readonly figures = FITNESS_FIGURES;

  hintForFigure(): string {
    switch (this.interaction.figure()) {
      case 'weights':
        return 'Brazo con curl · arrastra para girar en 3D';
      case 'squat':
        return 'Sentadilla · arrastra para girar en 3D';
      default:
        return 'Shaker · arrastra en cualquier dirección';
    }
  }

  onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.interaction.start(event.clientX, event.clientY);
  }

  onPointerMove(event: PointerEvent): void {
    this.interaction.move(event.clientX, event.clientY);
  }

  onPointerUp(event: PointerEvent): void {
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    this.interaction.end();
  }
}

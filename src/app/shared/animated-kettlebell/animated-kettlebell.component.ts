import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  afterNextRender,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-animated-kettlebell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center p-3 select-none cursor-pointer group"
      (click)="pumpWeights()"
    >
      <!-- Contenedor del Set Deportivo (Pesa Rusa Kettlebell + Mancuerna) -->
      <div #wrapper class="relative w-36 h-40 sm:w-40 sm:h-44 flex items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          class="w-full h-full drop-shadow-md overflow-visible"
        >
          <!-- 1. KETTLEBELL (PESA RUSA / BULGARA) ATRÁS -->
          <g #kettlebell transform-origin="50 110">
            <!-- Asa / Mango de la Pesa Rusa -->
            <path
              d="M 28,68 C 28,18 72,18 72,68"
              fill="none"
              class="stroke-[#1e3a5f] dark:stroke-[#2a4d7d]"
              stroke-width="16"
              stroke-linecap="round"
            />
            <!-- Contorno oscuro de relieve para el asa -->
            <path
              d="M 28,68 C 28,18 72,18 72,68"
              fill="none"
              stroke="#0f1f33"
              stroke-width="3"
              stroke-linecap="round"
            />

            <!-- Cuerpo esférico de la Kettlebell -->
            <circle
              cx="50"
              cy="96"
              r="40"
              class="fill-[#244b7a] dark:fill-[#1e3e66] stroke-[#0f1f33]"
              stroke-width="3.5"
            />
            
            <!-- Base plana de apoyo inferior -->
            <path
              d="M 32,132 L 68,132"
              stroke="#0f1f33"
              stroke-width="5"
              stroke-linecap="round"
            />

            <!-- Brillo de luz curvo en la esfera (estilo ilustración plana) -->
            <path
              d="M 32,74 C 22,90 24,110 34,124"
              fill="none"
              class="stroke-white/20"
              stroke-width="4.5"
              stroke-linecap="round"
            />

            <!-- Indicador de peso (ej. 16 KG) -->
            <text
              x="50"
              y="102"
              text-anchor="middle"
              class="fill-white/80 font-black text-xs select-none pointer-events-none tracking-wider"
            >
              16 KG
            </text>
          </g>

          <!-- 2. MANCUERNA (DUMBBELL) EN PRIMER PLANO -->
          <g #dumbbell transform-origin="108 126">
            <!-- Barra horizontal metálica -->
            <rect
              x="62"
              y="120"
              width="74"
              height="11"
              rx="3"
              class="fill-[#f1f5f9] stroke-[#0f1f33]"
              stroke-width="3"
            />

            <!-- DISCOS IZQUIERDOS (Píldoras redondeadas fieles a la referencia) -->
            <!-- Disco interior izquierdo -->
            <rect
              x="66"
              y="102"
              width="13"
              height="48"
              rx="6"
              class="fill-[#ffffff] dark:fill-[#e2e8f0] stroke-[#0f1f33]"
              stroke-width="3"
            />
            <!-- Disco exterior izquierdo -->
            <rect
              x="50"
              y="107"
              width="13"
              height="38"
              rx="6"
              class="fill-[#ffffff] dark:fill-[#e2e8f0] stroke-[#0f1f33]"
              stroke-width="3"
            />

            <!-- DISCOS DERECHOS (Píldoras redondeadas fieles a la referencia) -->
            <!-- Disco interior derecho -->
            <rect
              x="118"
              y="102"
              width="13"
              height="48"
              rx="6"
              class="fill-[#ffffff] dark:fill-[#e2e8f0] stroke-[#0f1f33]"
              stroke-width="3"
            />
            <!-- Disco exterior derecho -->
            <rect
              x="134"
              y="107"
              width="13"
              height="38"
              rx="6"
              class="fill-[#ffffff] dark:fill-[#e2e8f0] stroke-[#0f1f33]"
              stroke-width="3"
            />
          </g>

          <!-- 3. EFECTO DE IMPACTO / ENERGÍA FITNESS -->
          <g #sweatParticles opacity="0">
            <!-- Destellos de esfuerzo lima y cian -->
            <circle cx="108" cy="80" r="3.5" class="fill-[#c9ff3d]" />
            <circle cx="140" cy="95" r="3" class="fill-[#38bdf8]" />
            <circle cx="20" cy="55" r="3" class="fill-[#c9ff3d]" />
            <path d="M 100,75 L 115,65" stroke="#c9ff3d" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 125,82 L 138,78" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
          </g>
        </svg>
      </div>

      <!-- Badge con micro-interacción -->
      <div class="mt-2 text-center">
        <span class="inline-flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-[#c9ff3d] bg-gray-100 dark:bg-white/10 px-3.5 py-1 rounded-full group-hover:scale-105 transition shadow-xs">
          <span>💪</span>
          <span>{{ statusText() }}</span>
        </span>
      </div>
    </div>
  `,
})
export class AnimatedKettlebellComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly statusText = signal('¡Toca para levantar las pesas!');

  readonly kettlebell = viewChild<ElementRef<SVGGElement>>('kettlebell');
  readonly dumbbell = viewChild<ElementRef<SVGGElement>>('dumbbell');
  readonly sweatParticles = viewChild<ElementRef<SVGGElement>>('sweatParticles');

  private ctx?: gsap.Context;

  constructor() {
    afterNextRender(() => {
      this.initAnimations();
    });

    this.destroyRef.onDestroy(() => {
      this.ctx?.revert();
    });
  }

  private initAnimations(): void {
    this.ctx = gsap.context(() => {
      const kb = this.kettlebell()?.nativeElement;
      if (kb) {
        // Balanceo suave en reposo estilo kettlebell swing
        gsap.to(kb, {
          rotation: 3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    });
  }

  pumpWeights(): void {
    const kb = this.kettlebell()?.nativeElement;
    const db = this.dumbbell()?.nativeElement;
    const fx = this.sweatParticles()?.nativeElement;

    if (!kb || !db || !fx) return;

    this.statusText.set('¡Entrenamiento intenso! 🏋️');

    const tl = gsap.timeline({
      onComplete: () => {
        this.statusText.set('¡Serie completada! 🦾');
        setTimeout(() => this.statusText.set('¡Toca para levantar las pesas!'), 2500);
      },
    });

    // 1. Levantamiento explosivo de la mancuerna (Bicep Curl / Snatch)
    tl.to(db, {
      y: -32,
      rotation: 15,
      duration: 0.18,
      ease: 'power3.out',
    })
      // 2. Kettlebell swing potente hacia arriba
      .to(
        kb,
        {
          y: -24,
          rotation: -14,
          duration: 0.22,
          ease: 'power2.out',
        },
        '<0.05'
      )
      // 3. Destellos de fuerza y sudor
      .fromTo(
        fx,
        { opacity: 0, scale: 0.6, transformOrigin: '100 90' },
        { opacity: 1, scale: 1.25, duration: 0.2, yoyo: true, repeat: 1 },
        '-=0.15'
      )
      // 4. Bajada controlada con impacto elástico en el suelo
      .to(db, {
        y: 0,
        rotation: 0,
        duration: 0.35,
        ease: 'bounce.out',
      })
      .to(
        kb,
        {
          y: 0,
          rotation: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
        },
        '<0.1'
      );
  }
}

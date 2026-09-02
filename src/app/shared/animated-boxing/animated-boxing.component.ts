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
  selector: 'app-animated-boxing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center p-3 select-none cursor-pointer group"
      (click)="gentleSwing()"
    >
      <!-- Contenedor de los Guantes Rojos Colgantes -->
      <div #wrapper class="relative w-36 h-44 sm:w-40 sm:h-48 flex items-center justify-center">
        <svg
          viewBox="0 0 160 180"
          class="w-full h-full drop-shadow-lg overflow-visible"
        >
          <!-- CUERDAS SUPERIORES DESDE LAS QUE CUELGAN LOS GUANTES -->
          <line
            x1="74"
            y1="0"
            x2="66"
            y2="60"
            class="stroke-gray-400 dark:stroke-gray-500"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <line
            x1="82"
            y1="0"
            x2="94"
            y2="52"
            class="stroke-gray-400 dark:stroke-gray-500"
            stroke-width="2.5"
            stroke-linecap="round"
          />

          <!-- GRUPO PRINCIPAL PENDULAR (Pivote superior en las cuerdas 78 0) -->
          <g #hangingPair transform-origin="78 0">

            <!-- 1. GUANTE ROJO IZQUIERDO -->
            <g #leftGlove transform-origin="66 60">
              <!-- Cuello / Muñequera izquierda con ribetes blancos -->
              <path
                d="M 46,62 L 78,62 L 76,82 L 48,82 Z"
                class="fill-[#991b1b] dark:fill-[#7f1d1d] stroke-[#1c1917]"
                stroke-width="2.5"
              />
              <!-- Ribete blanco superior e inferior -->
              <line x1="46" y1="63" x2="78" y2="63" stroke="#ffffff" stroke-width="2.5" />
              <line x1="48" y1="81" x2="76" y2="81" stroke="#ffffff" stroke-width="2" />

              <!-- Cuerpo principal del guante rojo izquierdo -->
              <path
                d="M 46,82 C 34,92 28,114 36,134 C 44,152 64,158 76,154 C 84,150 86,134 86,110 C 86,88 80,82 76,82 Z"
                class="fill-[#dc2626] dark:fill-[#b91c1c] stroke-[#1c1917]"
                stroke-width="3"
                stroke-linejoin="round"
              />

              <!-- Sombra inferior de los nudillos -->
              <path
                d="M 42,126 C 40,146 62,156 76,154 C 84,152 86,138 86,128 C 76,134 52,134 42,126 Z"
                class="fill-[#991b1b] stroke-[#1c1917]"
                stroke-width="2"
              />

              <!-- Pulgar izquierdo anatómico hacia el exterior -->
              <path
                d="M 46,94 C 30,102 24,124 36,136 C 42,130 46,114 48,102 Z"
                class="fill-[#b91c1c] dark:fill-[#991b1b] stroke-[#1c1917]"
                stroke-width="2.5"
                stroke-linejoin="round"
              />

              <!-- Agujetas / Cordones blancos cruzados estilo vintage -->
              <g stroke="#ffffff" stroke-width="2" stroke-linecap="round">
                <line x1="58" y1="88" x2="68" y2="94" />
                <line x1="68" y1="88" x2="58" y2="94" />
                <line x1="58" y1="98" x2="68" y2="104" />
                <line x1="68" y1="98" x2="58" y2="104" />
                <line x1="58" y1="108" x2="68" y2="114" />
                <line x1="68" y1="108" x2="58" y2="114" />
              </g>

              <!-- Brillo blanco curvo de cuero auténtico -->
              <path
                d="M 38,108 C 34,120 40,134 48,142"
                fill="none"
                stroke="#ffffff"
                stroke-width="2.5"
                stroke-linecap="round"
                class="opacity-60"
              />
              <path
                d="M 52,148 C 62,152 72,150 78,144"
                fill="none"
                stroke="#ffffff"
                stroke-width="2.5"
                stroke-linecap="round"
                class="opacity-75"
              />
            </g>

            <!-- 2. GUANTE ROJO DERECHO (INCLINADO APOYADO SOBRE EL IZQUIERDO) -->
            <g #rightGlove transform-origin="94 52">
              <!-- Cuello / Muñequera derecha inclinada -->
              <g transform="rotate(22 92 62)">
                <rect
                  x="74"
                  y="52"
                  width="34"
                  height="20"
                  rx="3"
                  class="fill-[#991b1b] dark:fill-[#7f1d1d] stroke-[#1c1917]"
                  stroke-width="2.5"
                />
                <!-- Ribetes blancos de la muñequera -->
                <line x1="74" y1="53" x2="108" y2="53" stroke="#ffffff" stroke-width="2.5" />
                <line x1="75" y1="71" x2="107" y2="71" stroke="#ffffff" stroke-width="2" />
              </g>

              <!-- Cuerpo principal del guante rojo derecho -->
              <path
                d="M 80,72 C 96,78 126,98 126,124 C 126,146 104,156 88,154 C 76,150 72,136 74,116 C 76,96 78,76 80,72 Z"
                class="fill-[#ef4444] dark:fill-[#dc2626] stroke-[#1c1917]"
                stroke-width="3"
                stroke-linejoin="round"
              />

              <!-- Sombra inferior de los nudillos derechos -->
              <path
                d="M 78,132 C 84,152 104,154 116,146 C 124,138 124,126 122,120 C 108,132 88,134 78,132 Z"
                class="fill-[#991b1b] stroke-[#1c1917]"
                stroke-width="2"
              />

              <!-- Agujetas / Cordones derechos cruzados -->
              <g stroke="#ffffff" stroke-width="2" stroke-linecap="round">
                <line x1="82" y1="84" x2="92" y2="90" />
                <line x1="92" y1="84" x2="82" y2="90" />
                <line x1="83" y1="94" x2="93" y2="100" />
                <line x1="93" y1="94" x2="83" y2="100" />
                <line x1="84" y1="104" x2="94" y2="110" />
                <line x1="94" y1="104" x2="84" y2="110" />
              </g>

              <!-- Brillos de cuero en el lomo exterior del guante derecho -->
              <path
                d="M 102,88 C 116,100 120,116 118,132"
                fill="none"
                stroke="#ffffff"
                stroke-width="2.5"
                stroke-linecap="round"
                class="opacity-80"
              />
              <path
                d="M 98,146 C 106,148 114,142 118,136"
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="round"
                class="opacity-60"
              />
            </g>
          </g>
        </svg>
      </div>

      <!-- Badge con micro-interacción -->
      <div class="mt-2 text-center">
        <span class="inline-flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-[#c9ff3d] bg-gray-100 dark:bg-white/10 px-3.5 py-1 rounded-full group-hover:scale-105 transition shadow-xs">
          <span>🥊</span>
          <span>{{ statusText() }}</span>
        </span>
      </div>
    </div>
  `,
})
export class AnimatedBoxingComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly statusText = signal('¡Toca los guantes de boxeo!');

  readonly hangingPair = viewChild<ElementRef<SVGGElement>>('hangingPair');
  readonly leftGlove = viewChild<ElementRef<SVGGElement>>('leftGlove');
  readonly rightGlove = viewChild<ElementRef<SVGGElement>>('rightGlove');

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
      const pair = this.hangingPair()?.nativeElement;
      const left = this.leftGlove()?.nativeElement;
      const right = this.rightGlove()?.nativeElement;

      if (pair && left && right) {
        // Balanceo pendular continuo muy suave y elegante
        gsap.to(pair, {
          rotation: 5,
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        // Micro-balanceo suave individual
        gsap.to(left, {
          rotation: -1.5,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        gsap.to(right, {
          rotation: 2,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    });
  }

  gentleSwing(): void {
    const pair = this.hangingPair()?.nativeElement;
    const left = this.leftGlove()?.nativeElement;
    const right = this.rightGlove()?.nativeElement;

    if (!pair || !left || !right) return;

    this.statusText.set('¡Balanceo en el ring! 🥊');

    // Animación de balanceo armónico sin separarse ni chocarse
    const tl = gsap.timeline({
      onComplete: () => {
        this.statusText.set('¡Guantes listos! 🥊');
        setTimeout(() => this.statusText.set('¡Toca los guantes de boxeo!'), 2500);
      },
    });

    // Impulso pendular natural de todo el conjunto unido
    tl.to(pair, {
      rotation: 16,
      duration: 0.35,
      ease: 'power2.out',
    })
      .to(pair, {
        rotation: -12,
        duration: 0.5,
        ease: 'power1.inOut',
      })
      .to(pair, {
        rotation: 8,
        duration: 0.45,
        ease: 'power1.inOut',
      })
      .to(pair, {
        rotation: -4,
        duration: 0.4,
        ease: 'power1.inOut',
      })
      .to(pair, {
        rotation: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)',
      });
  }
}

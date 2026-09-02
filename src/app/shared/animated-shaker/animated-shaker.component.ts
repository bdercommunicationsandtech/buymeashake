import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  input,
  afterNextRender,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-animated-shaker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center p-3 select-none cursor-pointer group"
      (click)="shakeIt()"
    >
      <!-- Contenedor del Shaker con proporciones idénticas a la referencia -->
      <div #shakerWrapper class="relative w-28 h-44 sm:w-32 sm:h-48 flex items-center justify-center">
        <svg
          viewBox="0 0 140 210"
          class="w-full h-full drop-shadow-md overflow-visible"
        >
          <defs>
            <!-- ClipPath para el vaso cónico interno -->
            <clipPath id="cupInteriorClip">
              <polygon points="26,62 114,62 105,196 35,196" />
            </clipPath>
          </defs>

          <!-- GRUPO COMPLETO DEL SHAKER -->
          <g #shakerGroup transform-origin="70 140">
            
            <!-- 1. VASO PRINCIPAL (Cuerpo azul oscuro deportivo) -->
            <polygon
              points="24,60 116,60 106,198 34,198"
              class="fill-[#1b3452] dark:fill-[#122338] stroke-[#0f1f33] dark:stroke-[#091522]"
              stroke-width="3.5"
              stroke-linejoin="round"
            />

            <!-- 2. CONTENIDO INTERNO: Líquido verde lima fluido y limpio -->
            <g clip-path="url(#cupInteriorClip)">
              <!-- Líquido de proteína con onda deportiva (fiel a la referencia 1) -->
              <path
                #liquid
                d="M 20,110 Q 70,85 120,115 L 120,205 L 20,205 Z"
                class="fill-[#c9ff3d]"
              />
            </g>

            <!-- 3. MARCAS DE MEDIDA (ml/oz verticales lado derecho) -->
            <line x1="94" y1="92" x2="104" y2="92" stroke="#0f1f33" stroke-width="2.5" stroke-linecap="round" class="opacity-50" />
            <line x1="97" y1="110" x2="103" y2="110" stroke="#0f1f33" stroke-width="2" stroke-linecap="round" class="opacity-50" />
            <line x1="93" y1="128" x2="102" y2="128" stroke="#0f1f33" stroke-width="2.5" stroke-linecap="round" class="opacity-50" />
            <line x1="96" y1="146" x2="101" y2="146" stroke="#0f1f33" stroke-width="2" stroke-linecap="round" class="opacity-50" />

            <!-- 4. CONTORNO EXTERIOR DEL VASO (Para darle el acabado plano limpio) -->
            <polygon
              points="24,60 116,60 106,198 34,198"
              fill="none"
              class="stroke-[#101b2b] dark:stroke-[#091522]"
              stroke-width="4"
              stroke-linejoin="round"
            />

            <!-- 5. TAPA: BASE ANCHA NEGRA/GRIS OSCURA (Referencia 1 y 2) -->
            <rect
              x="18"
              y="44"
              width="104"
              height="18"
              rx="4"
              class="fill-[#2a3038] stroke-[#15191d]"
              stroke-width="3"
            />

            <!-- 6. DOMO SUPERIOR DE LA TAPA -->
            <path
              d="M 28,44 C 30,22 110,22 112,44 Z"
              class="fill-[#383f47] stroke-[#15191d]"
              stroke-width="3"
              stroke-linejoin="round"
            />

            <!-- 7. BOQUILLA Y TAPA FLIP CON ANILLO DE AGARRE (Fiel a la referencia 2) -->
            <!-- Boquilla de salida -->
            <rect
              x="30"
              y="20"
              width="24"
              height="16"
              rx="2"
              class="fill-[#20252b] stroke-[#15191d]"
              stroke-width="2.5"
            />

            <!-- Tapa Flip abatible naranja deportiva con asa circular grande (Bisagra en la unión derecha de la boquilla) -->
            <g #flipCap transform-origin="58 22">
              <!-- Tapa sobre la boquilla -->
              <rect
                x="26"
                y="14"
                width="34"
                height="10"
                rx="3"
                class="fill-[#ff5722] stroke-[#c8390d]"
                stroke-width="2.5"
              />
              <!-- Brazo conector naranja hacia el aro -->
              <path
                d="M 54,17 Q 82,19 90,26"
                fill="none"
                stroke="#ff5722"
                stroke-width="7"
                stroke-linecap="round"
              />
              <!-- Aro / Argolla de transporte grande -->
              <circle
                cx="100"
                cy="28"
                r="13"
                fill="none"
                stroke="#ff5722"
                stroke-width="6"
              />
              <circle
                cx="100"
                cy="28"
                r="13"
                fill="none"
                stroke="#c8390d"
                stroke-width="2"
              />
            </g>
          </g>

          <!-- Salpicaduras enérgicas al mezclar -->
          <g #splashGroup opacity="0">
            <circle cx="20" cy="50" r="3.5" class="fill-[#c9ff3d]" />
            <circle cx="120" cy="40" r="4" class="fill-[#c9ff3d]" />
            <circle cx="12" cy="110" r="2.5" class="fill-[#ff5722]" />
            <circle cx="128" cy="100" r="3" class="fill-[#ff5722]" />
          </g>
        </svg>
      </div>

      <!-- Badge con micro-interacción -->
      <div class="mt-3 text-center">
        <span class="inline-flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-[#c9ff3d] bg-gray-100 dark:bg-white/10 px-3.5 py-1.2 rounded-full group-hover:scale-105 transition shadow-xs">
          <span>⚡</span>
          <span>{{ statusText() }}</span>
        </span>
      </div>
    </div>
  `,
})
export class AnimatedShakerComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly autoShake = input<boolean>(false);
  readonly statusText = signal('¡Toca para agitar el Shaker!');

  readonly shakerGroup = viewChild<ElementRef<SVGGElement>>('shakerGroup');
  readonly liquid = viewChild<ElementRef<SVGPathElement>>('liquid');
  readonly flipCap = viewChild<ElementRef<SVGGElement>>('flipCap');
  readonly splashGroup = viewChild<ElementRef<SVGGElement>>('splashGroup');

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
      const liquid = this.liquid()?.nativeElement;
      if (liquid) {
        // Oleaje sutil y natural en reposo
        gsap.to(liquid, {
          y: -4,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      if (this.autoShake()) {
        this.shakeIt();
      }
    });
  }

  shakeIt(): void {
    const group = this.shakerGroup()?.nativeElement;
    const liquid = this.liquid()?.nativeElement;
    const splashes = this.splashGroup()?.nativeElement;
    const cap = this.flipCap()?.nativeElement;

    if (!group || !liquid || !splashes || !cap) return;

    this.statusText.set('¡Mezclando proteína!');

    // Timeline GSAP sincronizada
    const tl = gsap.timeline({
      onComplete: () => {
        this.statusText.set('¡Batido listo para entrenar! 🥤');
        setTimeout(() => this.statusText.set('¡Toca para agitar el Shaker!'), 2500);
      },
    });

    // 1. Sacudida energética del vaso
    tl.to(group, {
      duration: 0.07,
      rotation: -16,
      x: -10,
      y: -16,
      ease: 'power1.inOut',
      repeat: 7,
      yoyo: true,
    })
      // 2. Oleaje del batido
      .to(
        liquid,
        {
          duration: 0.09,
          y: -14,
          repeat: 6,
          yoyo: true,
          ease: 'sine.inOut',
        },
        '<'
      )
      // 4. Salpicaduras deportivas
      .fromTo(
        splashes,
        { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 },
        '-=0.3'
      )
      // 5. Tapa flip abriéndose HACIA ARRIBA al terminar de batir (fiel a un shaker real)
      .to(cap, {
        rotation: 45,
        duration: 0.22,
        yoyo: true,
        repeat: 1,
        ease: 'back.out(2)',
      })
      // 6. Asentamiento elástico en reposo
      .to(group, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.4,
        ease: 'elastic.out(1, 0.4)',
      });
  }
}

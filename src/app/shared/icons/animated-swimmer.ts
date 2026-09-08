import { Component, ChangeDetectionStrategy, input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-animated-swimmer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <svg
      #svgElement
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="viewBox()"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      aria-hidden="true"
      [class]="customClass()"
      (mouseenter)="onHover(true)"
      (mouseleave)="onHover(false)"
    >
      <!-- Nadador estilizado (Cabeza + Cuerpo Crol según pictograma) -->
      <g class="swimmer-body-group">
        <!-- Cabeza sólida -->
        <circle cx="13.8" cy="5.8" r="2.1" fill="currentColor" />

        <!-- Silueta del torso y brazos del nadador -->
        <path
          fill="currentColor"
          d="M 12.8 7.2
             C 11.8 6.2 10.8 5.2 9.5 5.2
             C 8.5 5.2 7.6 5.8 7.0 6.8
             L 5.5 9.8
             C 5.2 10.4 5.6 11.1 6.2 11.1
             C 6.6 11.1 7.0 10.8 7.2 10.4
             L 8.5 7.8
             C 8.7 7.4 9.1 7.2 9.5 7.2
             C 9.8 7.2 10.2 7.4 10.5 7.7
             L 11.2 8.5
             C 9.8 9.5 8.2 10.5 5.5 11.4
             C 5.0 11.6 4.8 12.2 5.2 12.6
             C 5.5 12.9 6.0 13.0 6.5 12.8
             C 9.2 12.0 11.5 11.0 13.2 9.6
             L 17.5 11.2
             C 18.5 11.6 19.2 11.4 19.5 10.8
             C 19.7 10.2 19.2 9.8 18.2 9.5
             L 13.8 7.8
             Z"
        />
      </g>

      <!-- 3 Olas horizontales onduladas -->
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <!-- Ola Superior -->
        <path
          class="wave wave-top"
          d="M 3.2 14.2 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0"
        />
        <!-- Ola Media -->
        <path
          class="wave wave-mid"
          d="M 3.2 17.4 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0"
        />
        <!-- Ola Inferior -->
        <path
          class="wave wave-bot"
          d="M 3.2 20.6 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0 c 1.4 -1.3 2.8 -1.3 4.2 0 c 1.4 1.3 2.8 1.3 4.2 0"
        />
      </g>
    </svg>
  `
})
export class AnimatedSwimmerComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tlSwimmer?: gsap.core.Tween;
  private tlWaveTop?: gsap.core.Tween;
  private tlWaveMid?: gsap.core.Tween;
  private tlWaveBot?: gsap.core.Tween;

  ngAfterViewInit(): void {
    const root = this.svgRef.nativeElement;
    const swimmer = root.querySelector('.swimmer-body-group');
    const waveTop = root.querySelector('.wave-top');
    const waveMid = root.querySelector('.wave-mid');
    const waveBot = root.querySelector('.wave-bot');

    if (!swimmer || !waveTop || !waveMid || !waveBot) return;

    // 1. Balanceo y propulsión del nadador en el agua
    this.tlSwimmer = gsap.to(swimmer, {
      y: -1.2,
      x: 0.8,
      rotation: -3.5,
      transformOrigin: '40% 70%',
      duration: 0.9,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    // 2. Movimiento de ondulación en contra-fase de las 3 olas (efecto hidro-dinámico)
    this.tlWaveTop = gsap.to(waveTop, {
      x: -1.8,
      duration: 1.1,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    this.tlWaveMid = gsap.to(waveMid, {
      x: 1.6,
      duration: 1.3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    this.tlWaveBot = gsap.to(waveBot, {
      x: -1.2,
      duration: 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  onHover(isHovered: boolean): void {
    const scale = isHovered ? 1.7 : 1;
    this.tlSwimmer?.timeScale(scale);
    this.tlWaveTop?.timeScale(scale);
    this.tlWaveMid?.timeScale(scale);
    this.tlWaveBot?.timeScale(scale);
  }

  ngOnDestroy(): void {
    this.tlSwimmer?.kill();
    this.tlWaveTop?.kill();
    this.tlWaveMid?.kill();
    this.tlWaveBot?.kill();
  }
}

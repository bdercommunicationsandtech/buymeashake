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
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      [class]="customClass()"
    >
      <g class="swimmer-group">
        <!-- Head -->
        <circle cx="12" cy="7" r="3" class="head" />
        <!-- Body -->
        <path d="M12 10v4" class="body-part" />
        <path d="M8 12l4-2 4 2" class="arms" />
      </g>
      <!-- Waves -->
      <path class="wave wave1" d="M2 18c2-1.5 4-1.5 6 0 2 1.5 4 1.5 6 0 2-1.5 4-1.5 6 0" />
      <path class="wave wave2" d="M2 21c2-1.5 4-1.5 6 0 2 1.5 4-1.5 6 0 2-1.5 4-1.5 6 0" />
    </svg>
  `
})
export class AnimatedSwimmerComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tl?: gsap.core.Timeline;

  ngAfterViewInit() {
    const swimmer = this.svgRef.nativeElement.querySelector('.swimmer-group');
    const waves = this.svgRef.nativeElement.querySelectorAll('.wave');
    const arms = this.svgRef.nativeElement.querySelector('.arms');

    this.tl = gsap.timeline({ repeat: -1 });

    // Swim motion
    this.tl.to(swimmer, {
      y: 2,
      duration: 0.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1
    });

    // Arms stroking
    gsap.to(arms, {
      rotation: 15,
      transformOrigin: '50% 50%',
      duration: 0.4,
      yoyo: true,
      repeat: -1,
      ease: 'power1.inOut'
    });

    // Waves moving
    gsap.to(waves, {
      x: -4,
      duration: 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  ngOnDestroy() {
    this.tl?.kill();
    gsap.killTweensOf(this.svgRef.nativeElement.querySelectorAll('.arms, .wave'));
  }
}

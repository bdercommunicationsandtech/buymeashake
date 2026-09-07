import { Component, ChangeDetectionStrategy, input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-animated-spa',
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
      fill="currentColor"
      aria-hidden="true"
      [class]="customClass()"
    >
      <g class="yoga-group">
        <!-- Figura de Yoga basada en la imagen -->
        <path fill-rule="evenodd" d="M12 2 C8 6 6 9 8 12 C9.5 14 10 15.5 10 18 L14 18 C14 15.5 14.5 14 16 12 C18 9 16 6 12 2 Z M12 5.5 C10 7.5 9 9 10 11 C10.5 12 11 12 12 12 C13 12 13.5 12 14 11 C15 9 14 7.5 12 5.5 Z" />
        <circle cx="12" cy="9" r="2.2" />
        <!-- Base (piernas cruzadas) -->
        <path d="M4 19 C4 17.5 20 17.5 20 19 C20 20.5 4 20.5 4 19 Z" />
      </g>
    </svg>
  `
})
export class AnimatedSpaComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tl?: gsap.core.Timeline;

  ngAfterViewInit() {
    const yoga = this.svgRef.nativeElement.querySelector('.yoga-group');

    this.tl = gsap.timeline({ repeat: -1 });

    // Breathing effect on the yoga figure (levitate & scale slightly)
    this.tl.to(yoga, {
      y: -2,
      scale: 1.02,
      transformOrigin: '50% 100%',
      duration: 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1
    });
  }

  ngOnDestroy() {
    this.tl?.kill();
  }
}

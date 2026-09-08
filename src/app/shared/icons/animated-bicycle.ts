import { Component, ChangeDetectionStrategy, input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-animated-bicycle',
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
      <g class="bike-group">
        <!-- Wheels -->
        <circle class="wheel back-wheel" cx="5.5" cy="17.5" r="3.5" />
        <circle class="wheel front-wheel" cx="18.5" cy="17.5" r="3.5" />
        <!-- Frame -->
        <path d="M15 6a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      </g>
    </svg>
  `
})
export class AnimatedBicycleComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tl?: gsap.core.Timeline;

  ngAfterViewInit() {
    const wheels = this.svgRef.nativeElement.querySelectorAll('.wheel');
    const bike = this.svgRef.nativeElement.querySelector('.bike-group');

    this.tl = gsap.timeline({ repeat: -1 });
    
    // Spin wheels
    gsap.to(wheels, {
      rotation: 360,
      transformOrigin: '50% 50%',
      ease: 'none',
      duration: 1,
      repeat: -1
    });

    // Bobbing bike
    this.tl.to(bike, {
      y: -2,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut'
    }).to(bike, {
      y: 0,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut'
    });
  }

  ngOnDestroy() {
    this.tl?.kill();
    gsap.killTweensOf(this.svgRef.nativeElement.querySelectorAll('.wheel'));
  }
}

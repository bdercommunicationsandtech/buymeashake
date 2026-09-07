import { Component, ChangeDetectionStrategy, input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-animated-body',
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
      <g class="calisthenics-group">
        <!-- Pull-up bar -->
        <path d="M4 6h16" class="bar" />
        <!-- Person -->
        <g class="person" transform-origin="12 8">
          <circle cx="12" cy="11" r="2.5" class="head" />
          <path d="M12 13.5v4" class="torso" />
          <!-- Arms pulling up -->
          <path d="M8 6l2 3 2 4.5" class="arm left-arm" />
          <path d="M16 6l-2 3-2 4.5" class="arm right-arm" />
          <!-- Legs -->
          <path d="M12 17.5l-3 4" class="leg left-leg" />
          <path d="M12 17.5l3 4" class="leg right-leg" />
        </g>
      </g>
    </svg>
  `
})
export class AnimatedBodyComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tl?: gsap.core.Timeline;

  ngAfterViewInit() {
    const person = this.svgRef.nativeElement.querySelector('.person');
    
    this.tl = gsap.timeline({ repeat: -1 });

    // Pull-up motion
    this.tl.to(person, {
      y: -3,
      duration: 1,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 1
    });
  }

  ngOnDestroy() {
    this.tl?.kill();
  }
}

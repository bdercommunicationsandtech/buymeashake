import { Component, ChangeDetectionStrategy, input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-animated-football',
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
      <defs>
        <mask id="soccerLinesMask">
          <rect width="24" height="24" fill="white" />
          <g stroke="black" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Center pentagon -->
            <polygon points="12,7.5 15.5,10 14.2,14.5 9.8,14.5 8.5,10" fill="none" />
            <!-- Radiating lines -->
            <line x1="12" y1="7.5" x2="12" y2="1.5" />
            <line x1="15.5" y1="10" x2="21" y2="7.5" />
            <line x1="14.2" y1="14.5" x2="18.5" y2="20" />
            <line x1="9.8" y1="14.5" x2="5.5" y2="20" />
            <line x1="8.5" y1="10" x2="3" y2="7.5" />
            <!-- Outer connecting lines to form hexagons -->
            <line x1="21" y1="7.5" x2="16.5" y2="2.5" />
            <line x1="12" y1="1.5" x2="16.5" y2="2.5" />
            <line x1="12" y1="1.5" x2="7.5" y2="2.5" />
            <line x1="3" y1="7.5" x2="7.5" y2="2.5" />
            <line x1="3" y1="7.5" x2="2" y2="14" />
            <line x1="5.5" y1="20" x2="2" y2="14" />
            <line x1="5.5" y1="20" x2="12" y2="22.5" />
            <line x1="18.5" y1="20" x2="12" y2="22.5" />
            <line x1="18.5" y1="20" x2="22" y2="14" />
            <line x1="21" y1="7.5" x2="22" y2="14" />
          </g>
        </mask>
      </defs>
      <g class="soccer-ball-group" transform-origin="12 12">
        <circle cx="12" cy="12" r="10.5" mask="url(#soccerLinesMask)" />
      </g>
    </svg>
  `
})
export class AnimatedFootballComponent implements AfterViewInit, OnDestroy {
  readonly size = input<number | string>(24);
  readonly viewBox = input<string>('0 0 24 24');
  readonly customClass = input<string>('');

  @ViewChild('svgElement') svgRef!: ElementRef<SVGElement>;
  private tl?: gsap.core.Timeline;

  ngAfterViewInit() {
    const ball = this.svgRef.nativeElement.querySelector('.soccer-ball-group');
    
    this.tl = gsap.timeline({ repeat: -1 });

    // Soccer spin bounce
    this.tl.to(ball, {
      y: -4,
      rotation: 45,
      scale: 1.05,
      transformOrigin: '50% 50%',
      duration: 0.6,
      ease: 'power1.out'
    }).to(ball, {
      y: 0,
      rotation: 90,
      scale: 1,
      transformOrigin: '50% 50%',
      duration: 0.6,
      ease: 'bounce.out'
    });
  }

  ngOnDestroy() {
    this.tl?.kill();
  }
}

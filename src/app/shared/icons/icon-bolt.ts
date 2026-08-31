import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-bolt',
  standalone: true,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.viewBox]="viewBox" [attr.width]="size" [attr.height]="size" fill="currentColor" aria-hidden="true" [class]="customClass">
      <path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15L11 21z"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconBoltComponent {
  @Input() size: number | string = 20;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}

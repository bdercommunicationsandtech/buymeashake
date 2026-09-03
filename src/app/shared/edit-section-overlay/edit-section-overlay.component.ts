import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-edit-section-overlay',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div class="relative h-full">
      @if (active()) {
        <button
          type="button"
          (click)="edit.emit(); $event.preventDefault(); $event.stopPropagation()"
          class="absolute top-3 right-3 z-20 h-8 w-8 rounded-lg bg-white text-gray-950 shadow-md grid place-items-center hover:bg-gray-100 transition cursor-pointer"
          [attr.aria-label]="label()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.414-9.414a2 2 0 000-2.828l-3.172-3.172a2 2 0 00-2.828 0L4.293 14.707A1 1 0 004 15.414V20z" />
          </svg>
        </button>
        <div
          class="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-2 ring-white/90 ring-offset-0"
        ></div>
      }
      <ng-content />
    </div>
  `,
})
export class EditSectionOverlayComponent {
  readonly active = input(false);
  readonly label = input('Editar sección');
  readonly edit = output<void>();
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    @if (message()) {
      <div class="alert" [class]="'alert--' + type()" role="alert">
        {{ message() }}
      </div>
    }
  `,
  styles: [`
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
    .alert--error {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .alert--success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert--info {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
  `],
})
export class AlertComponent {
  message = input('');
  type = input<'error' | 'success' | 'info'>('info');
}

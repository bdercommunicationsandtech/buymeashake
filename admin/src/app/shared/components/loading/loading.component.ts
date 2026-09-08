import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="loading-wrap" [class.overlay]="overlay()">
        <div class="spinner" aria-hidden="true"></div>
        @if (message()) {
          <p class="message">{{ message() }}</p>
        }
      </div>
    }
  `,
  styles: [`
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
    }
    .loading-wrap.overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.85);
      z-index: 10;
    }
    .spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid var(--color-border, #e5e7eb);
      border-top-color: var(--color-primary, #2563eb);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .message {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-muted, #6b7280);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingComponent {
  visible = input(true);
  overlay = input(false);
  message = input('');
}

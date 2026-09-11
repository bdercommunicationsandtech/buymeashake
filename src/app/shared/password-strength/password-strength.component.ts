import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/language.service';
import { evaluatePassword, PasswordEvaluation } from '../../core/utils/password-validator.util';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (password()) {
      <div class="mt-2 space-y-2">
        <div class="flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div
              class="h-full rounded-full transition-all duration-300"
              [class]="barColorClass()"
              [style.width.%]="evaluation().percentage"
            ></div>
          </div>
          <span class="shrink-0 text-xs font-bold tracking-wide transition-colors" [class]="textColorClass()">
            {{ levelLabel() }}
          </span>
        </div>
        <p class="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          {{ t().auth.passwordStrengthHint }}
        </p>
      </div>
    }
  `,
})
export class PasswordStrengthComponent {
  private readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;
  readonly lang = this.i18n.lang;

  readonly password = input<string>('');

  readonly evaluation = computed<PasswordEvaluation>(() => evaluatePassword(this.password()));

  readonly levelLabel = computed(() => {
    const lvl = this.evaluation().level;
    const auth = this.t().auth;
    switch (lvl) {
      case 'strong':
        return auth.passwordStrengthStrong;
      case 'fair':
        return auth.passwordStrengthFair;
      case 'weak':
      default:
        return auth.passwordStrengthWeak;
    }
  });

  readonly barColorClass = computed(() => {
    switch (this.evaluation().level) {
      case 'strong':
        return 'bg-emerald-500';
      case 'fair':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  });

  readonly textColorClass = computed(() => {
    switch (this.evaluation().level) {
      case 'strong':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'fair':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-rose-600 dark:text-rose-400';
    }
  });
}

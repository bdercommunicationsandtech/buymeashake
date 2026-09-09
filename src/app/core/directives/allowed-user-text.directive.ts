import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  Renderer2,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { Subject, timer } from 'rxjs';
import { switchMap } from 'rxjs';
import {
  filterAllowedUserText,
  handleUserTextKeydown,
  handleUserTextPaste,
  invalidAllowedCharsMessage,
  isAllowedUserTextChar,
} from '../utils/allowed-user-text.util';

/**
 * Strips disallowed characters and shows an inline hint with the allowed symbol set.
 *
 * Usage: `<input appAllowedUserText />` or `<textarea appAllowedUserText />`
 *
 * Skip on password, email, url, otp, and rich HTML editors.
 */
@Directive({
  selector: 'input[appAllowedUserText], textarea[appAllowedUserText]',
})
export class AllowedUserTextDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  /** When true (default), strip invalid chars on input (IME, drag-drop, autofill). */
  readonly stripOnInput = input(true, { alias: 'appAllowedUserTextStrip' });

  /** Hint visibility duration in ms. */
  readonly hintMs = input(4500, { alias: 'appAllowedUserTextHintMs' });

  readonly charsBlocked = output<string>();

  private hintEl: HTMLElement | null = null;
  private readonly blocked$ = new Subject<void>();
  private readonly unlisteners: Array<() => void> = [];

  constructor() {
    this.blocked$
      .pipe(
        switchMap(() => timer(this.hintMs())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.hideHint());
  }

  ngOnInit(): void {
    const host = this.el.nativeElement;

    // Capture phase so we strip BEFORE [value]/(input) handlers store bad chars in signals.
    host.addEventListener('beforeinput', this.onBeforeInput, true);
    host.addEventListener('keydown', this.onKeydown, true);
    host.addEventListener('paste', this.onPaste, true);
    host.addEventListener('input', this.onInput, true);

    this.unlisteners.push(
      () => host.removeEventListener('beforeinput', this.onBeforeInput, true),
      () => host.removeEventListener('keydown', this.onKeydown, true),
      () => host.removeEventListener('paste', this.onPaste, true),
      () => host.removeEventListener('input', this.onInput, true),
    );
  }

  ngOnDestroy(): void {
    for (const off of this.unlisteners) off();
    this.hideHint();
    this.blocked$.complete();
  }

  private readonly onBeforeInput = (event: Event): void => {
    const inputEvent = event as InputEvent;
    if (
      !inputEvent.inputType ||
      inputEvent.inputType.startsWith('delete') ||
      inputEvent.inputType === 'historyUndo'
    ) {
      return;
    }

    const data = inputEvent.data;
    if (data == null || data.length === 0) return;
    if ([...data].every((ch) => isAllowedUserTextChar(ch))) return;

    event.preventDefault();
    const filtered = filterAllowedUserText(data);
    if (filtered) this.insertText(filtered);
    this.showBlocked();
  };

  private readonly onKeydown = (event: Event): void => {
    handleUserTextKeydown(event as KeyboardEvent, () => this.showBlocked());
  };

  private readonly onPaste = (event: Event): void => {
    handleUserTextPaste(event as ClipboardEvent, () => this.showBlocked());
  };

  private readonly onInput = (event: Event): void => {
    if (!this.stripOnInput()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

    const raw = target.value;
    const filtered = filterAllowedUserText(raw);
    if (filtered === raw) return;

    const start = target.selectionStart ?? filtered.length;
    const delta = raw.length - filtered.length;
    target.value = filtered;
    const caret = Math.max(0, start - delta);
    target.setSelectionRange(caret, caret);
    this.syncControl(filtered);
    this.showBlocked();
  };

  private insertText(text: string): void {
    const target = this.el.nativeElement;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const maxLen = target.maxLength > 0 ? target.maxLength : null;
    const room = maxLen != null ? Math.max(0, maxLen - (target.value.length - (end - start))) : null;
    const insert = room == null ? text : text.slice(0, room);
    const next = target.value.slice(0, start) + insert + target.value.slice(end);
    const capped = maxLen != null ? next.slice(0, maxLen) : next;
    target.value = capped;
    const caret = start + insert.length;
    target.setSelectionRange(caret, caret);
    this.syncControl(capped);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private syncControl(value: string): void {
    this.ngControl?.control?.setValue(value, { emitEvent: true });
  }

  private showBlocked(): void {
    const message = invalidAllowedCharsMessage('es');
    this.charsBlocked.emit(message);
    this.ensureHint(message);
    this.blocked$.next();
  }

  private ensureHint(message: string): void {
    const host = this.el.nativeElement;
    if (!this.hintEl) {
      this.hintEl = this.renderer.createElement('p');
      this.renderer.setAttribute(this.hintEl, 'role', 'status');
      this.renderer.setAttribute(this.hintEl, 'aria-live', 'polite');
      this.renderer.addClass(this.hintEl, 'mt-1.5');
      this.renderer.addClass(this.hintEl, 'text-[11px]');
      this.renderer.addClass(this.hintEl, 'font-semibold');
      this.renderer.addClass(this.hintEl, 'leading-snug');
      this.renderer.addClass(this.hintEl, 'text-amber-700');
      this.renderer.addClass(this.hintEl, 'dark:text-amber-300');
      this.renderer.insertBefore(host.parentNode, this.hintEl, host.nextSibling);
    }
    this.renderer.setProperty(this.hintEl, 'textContent', message);
  }

  private hideHint(): void {
    if (!this.hintEl) return;
    this.renderer.removeChild(this.hintEl.parentNode, this.hintEl);
    this.hintEl = null;
  }
}

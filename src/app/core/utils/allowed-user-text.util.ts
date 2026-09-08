/**
 * Allowlist for free-form user text (profiles, messages, titles, search).
 * Aligned with Buyer1; excludes high-risk injection chars: ' & ( )
 *
 * Allowed: letters (incl. ES accents + ü), digits, spaces, . , ? ¿ ¡ ! @ : / - _
 *
 * Do NOT use on: passwords, emails, URLs, OTP, HTML/rich-text editors.
 */
const USER_TEXT_FULL = /^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9\s.,?¿¡!@:/\-_]+$/;
const USER_TEXT_CHAR = /^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9\s.,?¿¡!@:/\-_]$/;
const USER_TEXT_STRIP = /[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9\s.,?¿¡!@:/\-_]/g;

/** Single character check for real-time keydown/paste blocking. */
export function isAllowedUserTextChar(value: string): boolean {
  return USER_TEXT_CHAR.test(value);
}

/** Non-empty trimmed text with only allowed characters (required fields). */
export function isValidUserText(value: string): boolean {
  const text = (value || '').trim();
  return text.length > 0 && USER_TEXT_FULL.test(text);
}

/** Empty allowed; if content exists, only allowlisted chars (optional fields). */
export function hasOnlyAllowedUserTextChars(value: string): boolean {
  const text = (value || '').trim();
  return text.length === 0 || USER_TEXT_FULL.test(text);
}

/** Strip disallowed characters (useful for search / live filter). */
export function filterAllowedUserText(value: string): string {
  if (!value) return '';
  return value.replace(USER_TEXT_STRIP, '');
}

export const ALLOWED_USER_TEXT_SYMBOLS = '. , ? ¿ ¡ ! @ : / - _';

export function invalidAllowedCharsMessage(lang: 'es' | 'en' | string = 'es'): string {
  return lang === 'es'
    ? `Solo se permiten letras, números, espacios y estos símbolos: ${ALLOWED_USER_TEXT_SYMBOLS}`
    : `Only letters, numbers, spaces, and these symbols are allowed: ${ALLOWED_USER_TEXT_SYMBOLS}`;
}

export function handleUserTextKeydown(event: KeyboardEvent, onBlocked: () => void): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length !== 1) return;
  if (isAllowedUserTextChar(event.key)) return;
  event.preventDefault();
  onBlocked();
}

/**
 * Paste: keeps only allowlisted chars (better UX than rejecting the whole paste).
 * Calls onBlocked when any character was stripped.
 * Respects the host element's maxlength attribute when present.
 */
export function handleUserTextPaste(event: ClipboardEvent, onBlocked: () => void): void {
  const pasted = event.clipboardData?.getData('text') ?? '';
  if (!pasted) return;

  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

  const filtered = filterAllowedUserText(pasted);
  const maxLen = target.maxLength > 0 ? target.maxLength : null;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const room = maxLen != null ? Math.max(0, maxLen - (target.value.length - (end - start))) : null;
  const insert = room == null ? filtered : filtered.slice(0, room);

  if (filtered === pasted && (room == null || insert.length === filtered.length)) return;

  event.preventDefault();
  if (filtered !== pasted) onBlocked();

  const next = target.value.slice(0, start) + insert + target.value.slice(end);
  target.value = maxLen != null ? next.slice(0, maxLen) : next;
  const caret = start + insert.length;
  target.setSelectionRange(caret, caret);
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

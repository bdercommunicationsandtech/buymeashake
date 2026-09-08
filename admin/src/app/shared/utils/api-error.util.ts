type FastApiValidationError = {
  msg?: string;
  loc?: unknown[];
  type?: string;
};

export function formatApiErrorDetail(detail: unknown, fallback = 'Error en la solicitud.'): string {
  if (detail == null) return fallback;
  if (typeof detail === 'string') return detail.trim() || fallback;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && 'msg' in item) {
          const err = item as FastApiValidationError;
          const field = Array.isArray(err.loc)
            ? err.loc.filter((part) => part !== 'body').join('.')
            : '';
          const msg = typeof err.msg === 'string' ? err.msg.trim() : '';
          if (field && msg) return `${field}: ${msg}`;
          return msg;
        }
        return '';
      })
      .filter(Boolean);
    return messages.length > 0 ? messages.join(' ') : fallback;
  }

  if (typeof detail === 'object') {
    const maybeMessage = (detail as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }

  return fallback;
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const httpErr = err as { error?: { detail?: unknown }; message?: string };
  return formatApiErrorDetail(httpErr.error?.detail, httpErr.message?.trim() || fallback);
}

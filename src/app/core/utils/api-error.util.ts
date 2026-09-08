/** Pull a user-facing message from FastAPI / domain API error bodies. */
export function extractApiErrorMessage(err: unknown, fallback = 'Error al guardar.'): string {
  const body = (err as { error?: unknown } | null)?.error as
    | {
        error?: { message?: string };
        message?: string;
        detail?: unknown;
      }
    | string
    | null
    | undefined;

  if (!body) return fallback;
  if (typeof body === 'string' && body.trim()) return body;

  if (typeof body === 'object') {
    const nested = body.error?.message;
    if (typeof nested === 'string' && nested.trim()) return nested;

    if (typeof body.message === 'string' && body.message.trim()) return body.message;

    const detail = body.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      const msg = first?.msg;
      if (typeof msg === 'string' && msg.trim()) {
        return msg.toLowerCase().startsWith('value error,')
          ? msg.split(',').slice(1).join(',').trim()
          : msg;
      }
    }
  }

  return fallback;
}

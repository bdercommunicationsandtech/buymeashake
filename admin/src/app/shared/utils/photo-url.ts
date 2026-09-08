/**
 * Resuelve la foto de perfil (data URI en BD) para usar en `<img [src]>`.
 */
export function getProfilePhotoSrc(
  photo?: string | null,
  photoUrl?: string | null,
): string | null {
  const fromUrl = _resolve(photoUrl);
  if (fromUrl) return fromUrl;
  return _resolve(photo);
}

/** @deprecated Use getProfilePhotoSrc */
export function getProfilePhotoUrl(
  photo?: string | null,
  photoUrl?: string | null,
  _baseUrl?: string,
): string | null {
  return getProfilePhotoSrc(photo, photoUrl);
}

function _resolve(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 50) {
    let mime = 'image/png';
    if (trimmed.startsWith('/9j/')) mime = 'image/jpeg';
    else if (trimmed.startsWith('R0lG')) mime = 'image/gif';
    else if (trimmed.startsWith('UklG')) mime = 'image/webp';
    return `data:${mime};base64,${trimmed}`;
  }
  return null;
}

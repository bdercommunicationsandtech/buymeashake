/** Allowed hosts per social platform (aligned with backend `_SOCIAL_HOST_HINTS`). */
const SOCIAL_HOSTS: Record<string, readonly string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com', 'vm.tiktok.com'],
  facebook: ['facebook.com', 'fb.com'],
  twitter: ['twitter.com', 'x.com'],
};

const SOCIAL_EXAMPLES: Record<string, string> = {
  instagram: 'https://instagram.com/tu_usuario',
  tiktok: 'https://tiktok.com/@tu_usuario',
  facebook: 'https://facebook.com/tu_pagina',
  twitter: 'https://x.com/tu_usuario',
};

function hostMatches(host: string, allowed: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  return allowed.some((base) => {
    const b = base.toLowerCase().replace(/^www\./, '');
    return h === b || h.endsWith(`.${b}`);
  });
}

/** Empty is valid (optional field). Non-empty must be http(s) URL of the platform. */
export function isValidSocialUrl(
  platform: keyof typeof SOCIAL_HOSTS,
  value: string | null | undefined,
): boolean {
  const raw = (value || '').trim();
  if (!raw) return true;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (!parsed.hostname) return false;
    return hostMatches(parsed.hostname, SOCIAL_HOSTS[platform]);
  } catch {
    return false;
  }
}

export function socialUrlErrorMessage(platform: keyof typeof SOCIAL_HOSTS): string {
  return `URL inválida para ${platform}. Ejemplo: ${SOCIAL_EXAMPLES[platform]}`;
}

/** First invalid social URL message, or null if all OK. */
export function firstInvalidSocialUrlMessage(urls: {
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  twitter?: string | null;
}): string | null {
  const checks: Array<[keyof typeof SOCIAL_HOSTS, string | null | undefined]> = [
    ['instagram', urls.instagram],
    ['tiktok', urls.tiktok],
    ['facebook', urls.facebook],
    ['twitter', urls.twitter],
  ];
  for (const [platform, value] of checks) {
    if (!isValidSocialUrl(platform, value)) return socialUrlErrorMessage(platform);
  }
  return null;
}

export function getStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      // Ignorar errores en entornos con almacenamiento restringido
    }
  }
  return null;
}

export function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignorar errores en entornos con almacenamiento restringido
    }
  }
}

export function removeStorageItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar errores en entornos con almacenamiento restringido
    }
  }
}

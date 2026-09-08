import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  /**
   * Returns the browser timezone (e.g. "America/Hermosillo").
   * Uses Intl.DateTimeFormat().resolvedOptions().timeZone.
   */
  getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    } catch {
      return 'UTC';
    }
  }

  /**
   * Returns the timezone offset in minutes (e.g. -420 for UTC-7).
   */
  getOffset(): number {
    return -new Date().getTimezoneOffset();
  }
}

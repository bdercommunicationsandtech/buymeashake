import { Injectable } from '@angular/core';
import { TimezoneService } from './timezone.service';

@Injectable({ providedIn: 'root' })
export class DateTimeService {
  constructor(private timezone: TimezoneService) {}

  /**
   * Converts a UTC date (ISO string or Date) to the user's local timezone and returns a formatted string.
   * - Null/empty/invalid input → "-"
   * - Expects UTC from backend (ISO 8601 with Z); does not double-shift.
   */
  formatUtcToLocal(
    dateUtc: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const date = this.parseUtc(dateUtc);
    if (date === null) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      dateStyle: 'medium',
      timeStyle: 'short',
    };
    const merged = { ...defaultOptions, ...options };

    try {
      return new Intl.DateTimeFormat(undefined, {
        ...merged,
        timeZone: this.timezone.getTimezone(),
      }).format(date);
    } catch {
      return '-';
    }
  }

  /**
   * Parses UTC input to a Date. Returns null for null/empty/invalid.
   * ISO strings without Z are treated as UTC.
   */
  private parseUtc(value: string | Date | null | undefined): Date | null {
    if (value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      // Treat as UTC: ensure Z suffix for ISO-like strings without timezone
      const utcString = /Z$/i.test(trimmed) ? trimmed : trimmed + 'Z';
      const date = new Date(utcString);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    return null;
  }
}

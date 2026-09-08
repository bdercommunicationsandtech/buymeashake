import { Pipe, PipeTransform } from '@angular/core';
import { DateTimeService } from '../../core/services/datetime.service';

@Pipe({ name: 'utcToLocal', standalone: true })
export class UtcToLocalPipe implements PipeTransform {
  constructor(private datetime: DateTimeService) {}

  transform(
    value: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ): string {
    return this.datetime.formatUtcToLocal(value, options);
  }
}

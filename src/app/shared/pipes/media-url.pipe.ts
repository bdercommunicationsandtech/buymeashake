import { Pipe, PipeTransform } from '@angular/core';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

@Pipe({ name: 'mediaUrl', standalone: true, pure: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return resolveMediaUrl(url) ?? '';
  }
}

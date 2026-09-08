import { Injectable } from '@angular/core';
import { getProfilePhotoSrc } from '../../shared/utils/photo-url';

/**
 * Resuelve fotos de perfil almacenadas como data URI en accounts.photo.
 */
@Injectable({ providedIn: 'root' })
export class ProfilePhotoService {
  getProfilePhotoSrc(photo?: string | null, photoUrl?: string | null): string | null {
    return getProfilePhotoSrc(photo, photoUrl);
  }

  /** @deprecated Use getProfilePhotoSrc */
  getProfilePhotoUrl(photo?: string | null, photoUrl?: string | null): string | null {
    return this.getProfilePhotoSrc(photo, photoUrl);
  }
}

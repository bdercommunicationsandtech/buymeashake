import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HeroBannerItem {
  id: number;
  title?: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

const STORAGE_KEY = 'bms_hero_banners';

export const DEFAULT_HERO_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop', // Gym dumbbells athletic atmosphere
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2000&auto=format&fit=crop', // Track runner sunset sprint
  'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=2000&auto=format&fit=crop', // Road cycling endurance
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2000&auto=format&fit=crop', // Cross training kettlebell grip
  'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2000&auto=format&fit=crop', // Swimmer underwater motion
];

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/banners`;

  readonly heroImages = signal<string[]>(DEFAULT_HERO_IMAGES);

  constructor() {
    this.loadInitialImages();
  }

  loadInitialImages(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const activeUrls = parsed
              .filter((b: any) => b.status_id === 1 || b.isActive === true)
              .sort((a: any, b: any) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
              .map((b: any) => b.image_url ?? b.imageUrl)
              .filter(Boolean);
            if (activeUrls.length > 0) {
              this.heroImages.set(activeUrls);
            }
          }
        }
      } catch {
        // Fallback to default
      }
    }

    this.http.get<any[]>(this.apiUrl).pipe(
      catchError(() => of([])),
      map((items) => {
        if (!items || items.length === 0) return [];
        return items
          .filter((it) => it.status_id === 1 || it.is_active === true)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((it) => it.image_url || it.imageUrl)
          .filter(Boolean);
      }),
      tap((urls) => {
        if (urls.length > 0) {
          this.heroImages.set(urls);
        }
      })
    ).subscribe();
  }
}

import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/dashboard.service';
import { LookupService } from '../../core/lookup.service';
import { LookupItemDto } from '../../core/api.models';
import { EditorSavePatch } from './editor-save-patch';

@Component({
  selector: 'app-athlete-profile-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        (click)="onBackdrop($event)"
      >
        <div
          class="bg-white dark:bg-[#121614] rounded-3xl p-5 sm:p-8 max-w-3xl w-full border border-gray-200/80 dark:border-white/10 shadow-2xl relative max-h-[92vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="close.emit()"
            class="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 grid place-items-center text-xs font-bold cursor-pointer z-10"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white pr-8">Perfil de atleta</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Avatar, portada, nombre y redes de tu tarjeta pública.
          </p>

          @if (error()) {
            <p class="mt-3 text-xs font-bold text-red-500">{{ error() }}</p>
          }

          <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
            <div class="flex items-center gap-4">
              <div class="relative group shrink-0">
                @if (avatarUrl()) {
                  <img [src]="avatarUrl()" alt="Avatar" class="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-white/10" />
                } @else {
                  <div class="h-20 w-20 rounded-full bg-gray-900 text-[#c9ff3d] grid place-items-center text-2xl font-black">
                    {{ (fullName() || 'A').slice(0, 2).toUpperCase() }}
                  </div>
                }
              </div>
              <div>
                <h4 class="text-sm font-black text-gray-900 dark:text-white">Foto de Perfil</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avatar circular para tu perfil y top de atletas.</p>
                <label class="mt-2 inline-block rounded-xl border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  {{ uploadingAvatar() ? 'Subiendo...' : 'Subir foto' }}
                  <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)" [disabled]="uploadingAvatar()" />
                </label>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="relative group shrink-0 h-20 w-28 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5">
                @if (coverImageUrl()) {
                  <img [src]="coverImageUrl()" alt="Portada" class="h-full w-full object-cover" />
                } @else {
                  <div class="h-full w-full grid place-items-center text-gray-400">
                    <svg class="w-6 h-6 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                }
              </div>
              <div>
                <h4 class="text-sm font-black text-gray-900 dark:text-white">Portada de Perfil</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Banner principal del Hero en tu perfil público.</p>
                <label class="mt-2 inline-block rounded-xl border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  {{ uploadingCover() ? 'Subiendo...' : 'Subir portada' }}
                  <input type="file" accept="image/*" class="hidden" (change)="onCoverSelected($event)" [disabled]="uploadingCover()" />
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Nombre público</label>
              <input
                type="text"
                class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
                [value]="fullName()"
                (input)="fullName.set($any($event.target).value)"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Biografía deportiva</label>
              <textarea
                rows="3"
                class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
                [value]="bio()"
                (input)="bio.set($any($event.target).value)"
              ></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Ciudad / País</label>
                <input
                  type="text"
                  placeholder="Ej. CDMX, México"
                  class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
                  [value]="city()"
                  (input)="city.set($any($event.target).value)"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Disciplina principal</label>
                <select
                  class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none"
                  [value]="primarySportCode()"
                  (change)="primarySportCode.set(+$any($event.target).value)"
                >
                  @for (sport of sports(); track sport.code) {
                    <option [value]="sport.code">{{ sport.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pt-2 border-t border-gray-100 dark:border-white/10 space-y-4">
              <div>
                <h4 class="text-sm font-black text-gray-900 dark:text-white">Redes sociales</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Se muestran como iconos en tu página pública. Déjalas vacías si no quieres mostrarlas.</p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Instagram</label>
                  <input type="url" class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none" [value]="instagramUrl()" (input)="instagramUrl.set($any($event.target).value)" />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">TikTok</label>
                  <input type="url" class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none" [value]="tiktokUrl()" (input)="tiktokUrl.set($any($event.target).value)" />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Facebook</label>
                  <input type="url" class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none" [value]="facebookUrl()" (input)="facebookUrl.set($any($event.target).value)" />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Twitter / X</label>
                  <input type="url" class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191c1d] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] focus:outline-none" [value]="twitterUrl()" (input)="twitterUrl.set($any($event.target).value)" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="save()"
            [disabled]="saving() || !fullName().trim()"
            class="mt-6 rounded-full bg-[#c9ff3d] px-8 py-3 text-xs font-black text-gray-950 disabled:opacity-50 cursor-pointer"
          >
            {{ saving() ? 'Guardando…' : 'Guardar perfil' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AthleteProfileModalComponent {
  readonly open = input(false);
  readonly close = output<void>();
  readonly saved = output<EditorSavePatch>();

  private readonly dashboard = inject(DashboardService);
  private readonly lookup = inject(LookupService);

  readonly sports = signal<LookupItemDto[]>([]);
  readonly fullName = signal('');
  readonly bio = signal('');
  readonly city = signal('');
  readonly primarySportCode = signal(101);
  readonly avatarUrl = signal<string | null>(null);
  readonly coverImageUrl = signal<string | null>(null);
  readonly instagramUrl = signal('');
  readonly tiktokUrl = signal('');
  readonly facebookUrl = signal('');
  readonly twitterUrl = signal('');
  readonly uploadingAvatar = signal(false);
  readonly uploadingCover = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.lookup.getSportDisciplines().subscribe({
      next: (items) => this.sports.set(items),
      error: () => {},
    });

    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.dashboard.getProfile().subscribe({
        next: (p) => {
          this.fullName.set(p.full_name);
          this.bio.set(p.bio || '');
          this.city.set(p.city || '');
          this.primarySportCode.set(p.primary_sport_code || 101);
          this.avatarUrl.set(p.avatar_url);
          this.coverImageUrl.set(p.cover_image_url);
          this.instagramUrl.set(p.instagram_url || '');
          this.tiktokUrl.set(p.tiktok_url || '');
          this.facebookUrl.set(p.facebook_url || '');
          this.twitterUrl.set(p.twitter_url || '');
        },
        error: () => this.error.set('No se pudo cargar el perfil.'),
      });
    });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadingAvatar.set(true);
    this.dashboard.uploadImage(input.files[0]).subscribe({
      next: (res) => {
        this.uploadingAvatar.set(false);
        this.avatarUrl.set(res.url);
      },
      error: () => {
        this.uploadingAvatar.set(false);
        this.error.set('Error al subir imagen de avatar.');
      },
    });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadingCover.set(true);
    this.dashboard.uploadImage(input.files[0]).subscribe({
      next: (res) => {
        this.uploadingCover.set(false);
        this.coverImageUrl.set(res.url);
      },
      error: () => {
        this.uploadingCover.set(false);
        this.error.set('Error al subir imagen de portada.');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.dashboard
      .updateProfile({
        full_name: this.fullName(),
        bio: this.bio(),
        city: this.city(),
        primary_sport_code: this.primarySportCode(),
        avatar_url: this.avatarUrl() || undefined,
        cover_image_url: this.coverImageUrl() || undefined,
        instagram_url: this.instagramUrl().trim() || null,
        tiktok_url: this.tiktokUrl().trim() || null,
        facebook_url: this.facebookUrl().trim() || null,
        twitter_url: this.twitterUrl().trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit({
            name: this.fullName().trim(),
            bio: this.bio().trim() || undefined,
            city: this.city().trim() || undefined,
            avatarUrl: this.avatarUrl(),
            coverImageUrl: this.coverImageUrl(),
            instagramUrl: this.instagramUrl().trim() || null,
            tiktokUrl: this.tiktokUrl().trim() || null,
            facebookUrl: this.facebookUrl().trim() || null,
            twitterUrl: this.twitterUrl().trim() || null,
          });
          this.close.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error?.message || 'Error al guardar.');
        },
      });
  }
}

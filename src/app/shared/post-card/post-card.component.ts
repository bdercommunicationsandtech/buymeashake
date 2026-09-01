import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconLockComponent, IconStarComponent, IconShakerComponent } from '../icons';

export interface PostItem {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  publishedAt: string;
  likesCount: number;
  commentsCount: number;
  isMembersOnly: boolean;
  requiredTierName?: string;
  mediaType?: 'article' | 'video' | 'audio';
  coverImageUrl?: string;
  isUnlocked?: boolean;
}

@Component({
  selector: 'app-post-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconLockComponent, IconStarComponent, IconShakerComponent],
  template: `
    <article class="bg-white dark:bg-[#121614] rounded-3xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
      
      <!-- Portada con badge y estado de bloqueo -->
      @if (post().coverImageUrl) {
        <div class="relative h-56 sm:h-72 w-full bg-gray-900 overflow-hidden">
          <img
            [src]="post().coverImageUrl"
            [alt]="post().title"
            class="w-full h-full object-cover transition-transform duration-700"
            [class.blur-sm]="post().isMembersOnly && !post().isUnlocked"
            [class.opacity-40]="post().isMembersOnly && !post().isUnlocked"
          />
          
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          <!-- Tipo de post -->
          <div class="absolute top-4 left-4">
            @if (post().isMembersOnly) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-black text-amber-400 dark:text-[#c9ff3d] border border-amber-400/30">
                <app-icon-lock size="13" />
                <span>Solo Miembros {{ post().requiredTierName ? '(' + post().requiredTierName + ')' : '' }}</span>
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                Público
              </span>
            }
          </div>

          <!-- Overlay de Bloqueo Exclusivo -->
          @if (post().isMembersOnly && !post().isUnlocked) {
            <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div class="h-14 w-14 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 dark:text-[#c9ff3d] mb-3 shadow-xl">
                <app-icon-lock size="24" />
              </div>
              <h4 class="text-base font-black text-white max-w-xs">Contenido Exclusivo para Miembros</h4>
              <p class="text-xs text-gray-300 mt-1 max-w-xs">
                Únete a la membresía de {{ post().authorName }} para desbloquear este entrenamiento y su desglose completo.
              </p>
              <button
                type="button"
                (click)="onUnlock.emit(post())"
                class="mt-4 rounded-full bg-[#c9ff3d] hover:bg-[#bbf033] text-gray-950 px-6 py-2.5 text-xs font-black transition shadow-lg shadow-[#c9ff3d]/20 active:scale-95"
              >
                Desbloquear por Membresía
              </button>
            </div>
          }
        </div>
      }

      <!-- Cuerpo del Post -->
      <div class="p-6 sm:p-7 space-y-4">
        
        <!-- Header: Autor y Fecha -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            @if (post().authorAvatar) {
              <img [src]="post().authorAvatar" [alt]="post().authorName" class="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-white/10" />
            } @else {
              <div class="h-9 w-9 rounded-full bg-gray-900 text-[#c9ff3d] grid place-items-center font-black text-xs">
                {{ post().authorName.slice(0, 2).toUpperCase() }}
              </div>
            }
            <div>
              <p class="font-black text-gray-900 dark:text-white">{{ post().authorName }}</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">&#64;{{ post().authorHandle }}</p>
            </div>
          </div>
          <span class="text-gray-400 font-medium">{{ post().publishedAt }}</span>
        </div>

        <!-- Título y Extracto -->
        <div>
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white tracking-tight leading-snug">
            {{ post().title }}
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            {{ post().excerpt }}
          </p>
        </div>

        <!-- Barra inferior interactiva: Likes y Comentarios -->
        <div class="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-4">
            <button
              type="button"
              (click)="onLike.emit(post().id)"
              class="flex items-center gap-1.5 hover:text-red-500 transition py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Dar like"
            >
              <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
              </svg>
              <span>{{ post().likesCount }}</span>
            </button>

            <span class="flex items-center gap-1.5 py-1 px-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <span>{{ post().commentsCount }} comentarios</span>
            </span>
          </div>

          @if (!post().isMembersOnly || post().isUnlocked) {
            <button
              type="button"
              (click)="onRead.emit(post())"
              class="text-emerald-600 dark:text-[#c9ff3d] font-black hover:underline"
            >
              Leer completo →
            </button>
          }
        </div>

      </div>
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<PostItem>();
  readonly onLike = output<string>();
  readonly onUnlock = output<PostItem>();
  readonly onRead = output<PostItem>();
}

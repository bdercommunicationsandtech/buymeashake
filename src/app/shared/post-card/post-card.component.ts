import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconLockComponent } from '../icons';
import { AllowedUserTextDirective } from '../../core/directives/allowed-user-text.directive';
import { LanguageService } from '../../core/language.service';


export interface PostCommentItem {
  id: number;
  userName: string;
  userAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface PostItem {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string | null;
  publishedAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isMembersOnly: boolean;
  isShakeSupporters?: boolean;
  requiredTierName?: string | null;
  mediaType?: 'article' | 'video' | 'audio' | null;
  coverImageUrl?: string | null;
  isUnlocked?: boolean;
  comments?: PostCommentItem[];
}

@Component({
  selector: 'app-post-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, IconLockComponent, AllowedUserTextDirective],
  template: `
    <article class="bg-white dark:bg-[#121614] rounded-3xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
      
      <!-- Portada como teaser (también visible si el post está bloqueado) -->
      @if (post().coverImageUrl) {
        <a [routerLink]="['/', post().authorHandle, 'posts', post().id]" class="relative block h-56 sm:h-72 w-full bg-gray-900 overflow-hidden">
          <img
            [src]="post().coverImageUrl"
            [alt]="post().title"
            class="w-full h-full object-cover transition-[filter,transform] duration-700"
            [class.blur-md]="isLocked()"
            [class.scale-110]="isLocked()"
            [class.brightness-75]="isLocked()"
          />
          
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            [class.via-black/45]="isLocked()"
            [class.to-black/25]="isLocked()"
          ></div>

          <!-- Tipo de post -->
          <div class="absolute top-4 left-4">
            @if (post().isMembersOnly) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-black text-amber-400 dark:text-[#c9ff3d] border border-amber-400/30">
                <app-icon-lock size="13" />
                <span>{{ t().post.membersOnly }} {{ post().requiredTierName ? '(' + post().requiredTierName + ')' : '' }}</span>
              </span>
            } @else if (post().isShakeSupporters) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-black text-sky-300 border border-sky-400/30">
                <app-icon-lock size="13" />
                <span>{{ t().post.shakeSupporters }}</span>
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                {{ t().post.public }}
              </span>
            }
          </div>

          @if (isLocked()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-black/50 backdrop-blur-[1px]">
              <div class="h-14 w-14 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 dark:text-[#c9ff3d] mb-3 shadow-xl">
                <app-icon-lock size="24" />
              </div>
              <h4 class="text-base font-black text-white max-w-xs">{{ t().post.exclusiveContent }}</h4>
              <p class="text-xs text-gray-300 mt-1 max-w-xs">
                @if (post().isShakeSupporters) {
                  {{ t().post.shakeExclusivePromptPrefix }} {{ post().authorName }} {{ t().post.shakeExclusivePromptSuffix }}
                } @else {
                  {{ t().post.exclusivePromptPrefix }} {{ post().authorName }} {{ t().post.exclusivePromptSuffix }}
                }
              </p>
              <button
                type="button"
                (click)="$event.preventDefault(); $event.stopPropagation(); onUnlock.emit(post())"
                class="mt-4 rounded-full bg-[#c9ff3d] hover:bg-[#bbf033] text-gray-950 px-6 py-2.5 text-xs font-black transition shadow-lg shadow-[#c9ff3d]/20 active:scale-95"
              >
                {{ post().isShakeSupporters ? t().post.unlockWithShake : t().post.unlockWithMembership }}
              </button>
            </div>
          }
        </a>
      } @else if (isLocked()) {
        <div class="relative block h-44 sm:h-52 w-full bg-gradient-to-br from-gray-900 via-[#121614] to-gray-950 overflow-hidden">
          <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div class="h-14 w-14 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 dark:text-[#c9ff3d] mb-3 shadow-xl">
              <app-icon-lock size="24" />
            </div>
            <h4 class="text-base font-black text-white max-w-xs">{{ t().post.exclusiveContent }}</h4>
            <p class="text-xs text-gray-300 mt-1 max-w-xs">
              @if (post().isShakeSupporters) {
                {{ t().post.shakeExclusivePromptPrefix }} {{ post().authorName }} {{ t().post.shakeExclusivePromptSuffix }}
              } @else {
                {{ t().post.exclusivePromptPrefix }} {{ post().authorName }} {{ t().post.exclusivePromptSuffix }}
              }
            </p>
            <button
              type="button"
              (click)="onUnlock.emit(post())"
              class="mt-4 rounded-full bg-[#c9ff3d] hover:bg-[#bbf033] text-gray-950 px-6 py-2.5 text-xs font-black transition shadow-lg shadow-[#c9ff3d]/20 active:scale-95"
            >
              {{ post().isShakeSupporters ? t().post.unlockWithShake : t().post.unlockWithMembership }}
            </button>
          </div>
          <div class="absolute top-4 left-4">
            @if (post().isMembersOnly) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-black text-amber-400 dark:text-[#c9ff3d] border border-amber-400/30">
                <app-icon-lock size="13" />
                <span>{{ t().post.membersOnly }}</span>
              </span>
            } @else if (post().isShakeSupporters) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-black text-sky-300 border border-sky-400/30">
                <app-icon-lock size="13" />
                <span>{{ t().post.shakeSupporters }}</span>
              </span>
            }
          </div>
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

        <!-- Título y teaser -->
        <div>
          @if (!post().coverImageUrl && !isLocked() && (post().isMembersOnly || post().isShakeSupporters)) {
            <div class="mb-2">
              @if (post().isMembersOnly) {
                <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-[#c9ff3d] border border-amber-200 dark:border-amber-900/40">
                  <app-icon-lock size="11" />
                  {{ t().post.membersOnly }}
                </span>
              } @else if (post().isShakeSupporters) {
                <span class="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40">
                  <app-icon-lock size="11" />
                  {{ t().post.shakeSupporters }}
                </span>
              }
            </div>
          }
          <h3 class="font-display text-xl font-black text-gray-950 dark:text-white tracking-tight leading-snug">
            <a
              [routerLink]="['/', post().authorHandle, 'posts', post().id]"
              class="hover:underline decoration-[#c9ff3d] underline-offset-4"
            >
              {{ post().title }}
            </a>
          </h3>
          @if (post().excerpt) {
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
              {{ post().excerpt }}
            </p>
          }
        </div>

        <!-- Barra inferior interactiva: Likes y Comentarios -->
        <div class="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-4">
            <button
              type="button"
              (click)="handleLikeClick()"
              class="flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer select-none active:scale-95 transition-transform duration-100"
              [class]="post().isLiked
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'"
              [attr.aria-label]="t().post.likeAria"
              [attr.aria-pressed]="post().isLiked ? 'true' : 'false'"
            >
              <span
                class="inline-flex relative"
                [class.bm-like-pop]="likePulse()"
                (animationend)="likePulse.set(false)"
              >
                @if (post().isLiked) {
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                  </svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                }
              </span>
              <span
                class="tabular-nums"
                [class.bm-like-count-bump]="likePulse()"
              >{{ post().likesCount }}</span>
            </button>

            <button
              type="button"
              (click)="toggleComments()"
              class="flex items-center gap-1.5 py-1 px-2 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
            >
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <span>{{ post().comments?.length || post().commentsCount || 0 }} {{ (post().comments?.length || post().commentsCount || 0) === 1 ? t().post.comment : t().post.comments }}</span>
            </button>
          </div>

          @if (isLocked()) {
            <button
              type="button"
              (click)="onUnlock.emit(post())"
              class="text-emerald-600 dark:text-[#c9ff3d] font-black hover:underline cursor-pointer"
            >
              {{ post().isShakeSupporters ? t().post.unlockWithShake : t().post.unlockWithMembership }}
            </button>
          } @else {
            <a
              [routerLink]="['/', post().authorHandle, 'posts', post().id]"
              class="text-emerald-600 dark:text-[#c9ff3d] font-black hover:underline cursor-pointer"
            >
              {{ t().post.readMore }}
            </a>
          }
        </div>

        <!-- Sección Desplegable de Comentarios -->
        @if (commentsOpen()) {
          <div class="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">

            @if (isLocked()) {
              <div
                class="rounded-xl border px-3 py-3 text-xs leading-relaxed"
                [class]="post().isShakeSupporters
                  ? 'border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100'
                  : 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'"
              >
                <p class="font-bold">
                  {{ post().isShakeSupporters ? t().post.shakeSupporters : t().post.membersOnly }}
                </p>
                <p class="mt-1 opacity-90">
                  {{ post().isShakeSupporters ? t().post.commentLockedShake : t().post.commentLockedMembers }}
                </p>
                <button
                  type="button"
                  (click)="onUnlock.emit(post())"
                  class="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#c9ff3d] px-3.5 py-1.5 text-[11px] font-black text-gray-950 hover:bg-[#bbf033] transition cursor-pointer"
                >
                  {{ t().post.commentLockedCta }}
                </button>
              </div>
            } @else {
              <!-- Input para agregar comentario -->
              <div class="flex gap-2">
                <input
                  type="text"
                  appAllowedUserText
                  maxlength="200"
                  [placeholder]="t().post.writeComment"
                  [disabled]="isCommenting()"
                  class="flex-1 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:border-[#c9ff3d] disabled:opacity-60"
                  [ngModel]="newCommentText()"
                  (ngModelChange)="newCommentText.set($event)"
                  (keyup.enter)="submitComment()"
                />
                <button
                  type="button"
                  (click)="submitComment()"
                  [disabled]="isCommenting() || !newCommentText().trim()"
                  class="min-w-[5.5rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-950 dark:bg-[#c9ff3d] text-white dark:text-gray-950 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  @if (isCommenting()) {
                    <span
                      class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
                      aria-hidden="true"
                    ></span>
                    <span>{{ t().post.submittingComment }}</span>
                  } @else {
                    {{ t().post.submitComment }}
                  }
                </button>
              </div>
            }

            <!-- Lista de comentarios -->
            @if (!isLocked()) {
              <div class="space-y-2 pt-1">
                @for (c of post().comments; track c.id) {
                  <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/60 dark:bg-white/5 text-xs">
                    <div class="h-6 w-6 rounded-full bg-gray-900 text-[#c9ff3d] grid place-items-center font-bold text-[10px] shrink-0">
                      {{ c.userName.slice(0, 1).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-gray-900 dark:text-white">{{ c.userName }}</span>
                        <span class="text-[10px] text-gray-400">{{ c.createdAt }}</span>
                      </div>
                      <p class="text-gray-600 dark:text-gray-300 mt-0.5">{{ c.content }}</p>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-center text-gray-400 py-2">{{ t().post.firstToComment }}</p>
                }
              </div>
            }

          </div>
        }

      </div>
    </article>
  `,
  styles: `
    @keyframes bm-like-pop {
      0% { transform: scale(1); }
      35% { transform: scale(1.35); }
      65% { transform: scale(0.92); }
      100% { transform: scale(1); }
    }
    @keyframes bm-like-count-bump {
      0% { transform: translateY(0); opacity: 1; }
      40% { transform: translateY(-3px); opacity: 0.85; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .bm-like-pop {
      animation: bm-like-pop 320ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
    }
    .bm-like-count-bump {
      animation: bm-like-count-bump 280ms ease-out;
    }
  `,
})
export class PostCardComponent {
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;

  readonly post = input.required<PostItem>();
  readonly onLike = output<string>();
  readonly onUnlock = output<PostItem>();
  readonly onRead = output<PostItem>();
  readonly onComment = output<{
    postId: string;
    content: string;
    done: (ok: boolean) => void;
  }>();

  readonly commentsOpen = signal(false);
  readonly newCommentText = signal('');
  readonly likePulse = signal(false);
  readonly isCommenting = signal(false);

  handleLikeClick(): void {
    this.likePulse.set(false);
    queueMicrotask(() => this.likePulse.set(true));
    this.onLike.emit(this.post().id);
  }

  isLocked(): boolean {
    return this.post().isUnlocked === false;
  }

  toggleComments(): void {
    this.commentsOpen.update((v) => !v);
  }

  submitComment(): void {
    if (this.isLocked() || this.isCommenting()) return;
    const text = this.newCommentText().trim();
    if (!text) return;

    this.isCommenting.set(true);
    this.newCommentText.set('');
    this.onComment.emit({
      postId: this.post().id,
      content: text,
      done: (ok) => {
        this.isCommenting.set(false);
        if (!ok) this.newCommentText.set(text);
      },
    });
  }
}

import { Component, computed, inject, OnDestroy, SecurityContext, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExploreService } from '../../../core/explore.service';
import { PostCommentDto, PostItemDto } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';
import { AuthService } from '../../../core/auth.service';
import { SupporterService } from '../../../core/supporter.service';
import { resolveMediaUrl, resolveMediaUrlsInHtml } from '../../../core/utils/media-url.util';
import { IconLockComponent } from '../../../shared/icons';
import { AllowedUserTextDirective } from '../../../core/directives/allowed-user-text.directive';

function isSafeMediaUrl(url: string): boolean {
  try {
    const resolved = resolveMediaUrl(url) ?? url;
    if (resolved.startsWith('data:') || resolved.startsWith('blob:')) return false;
    const parsed = new URL(resolved);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractFirstImageUrl(content: string): string | null {
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch?.[1] && isSafeMediaUrl(htmlMatch[1])) {
    return resolveMediaUrl(htmlMatch[1]);
  }

  const mdMatch = content.match(/!\[[^\]]*]\(([^)\s]+)\)/);
  if (mdMatch?.[1] && isSafeMediaUrl(mdMatch[1])) {
    return resolveMediaUrl(mdMatch[1]);
  }

  return null;
}

function stripFirstImage(content: string): string {
  return content
    .replace(/!\[[^\]]*]\(([^)\s]+)\)/, '')
    .replace(/<img[^>]*>/i, '')
    .trim();
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toRenderableHtml(content: string, stripLeadingImage = false): string {
  let htmlBody = (stripLeadingImage ? stripFirstImage(content) : content).trim();
  if (!htmlBody) return '';

  htmlBody = htmlBody.replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    if (!isSafeMediaUrl(src)) return '';
    const safeAlt = escapeHtmlAttr(String(alt || 'Imagen'));
    const safeSrc = escapeHtmlAttr(resolveMediaUrl(src) || src);
    return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy" />`;
  });

  if (!htmlBody.includes('<')) {
    htmlBody = htmlBody
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
      .join('');
  }

  return resolveMediaUrlsInHtml(htmlBody);
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconLockComponent, AllowedUserTextDirective],
  templateUrl: './post-detail.html',
})
export class PostDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exploreService = inject(ExploreService);
  private readonly authService = inject(AuthService);
  private readonly supporterService = inject(SupporterService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;
  private readonly paramsSub: Subscription;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly post = signal<PostItemDto | null>(null);
  readonly handle = signal('');
  readonly commentsOpen = signal(false);
  readonly newCommentText = signal('');
  readonly isCommenting = signal(false);
  readonly deletingCommentId = signal<number | null>(null);

  readonly isLocked = computed(() => this.post()?.is_unlocked === false);

  readonly isMembersOnly = computed(() => {
    const p = this.post();
    return !!p && (p.is_members_only || p.access_type === 'members_only');
  });

  readonly isShakeSupporters = computed(() => {
    const p = this.post();
    return !!p && (!!p.is_shake_supporters || p.access_type === 'shake_supporters');
  });

  readonly accessLabel = computed(() => {
    if (this.isMembersOnly()) return this.t().post.membersOnly;
    if (this.isShakeSupporters()) return this.t().post.shakeSupporters;
    return this.t().post.public;
  });

  readonly teaserText = computed(() => {
    const p = this.post();
    if (!p) return '';
    const fromExcerpt = (p.excerpt || '').trim();
    if (fromExcerpt) return fromExcerpt;
    return p.content_html
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  });

  readonly coverImageUrl = computed(() => {
    const p = this.post();
    if (!p) return null;
    // Cover actúa como teaser: visible aunque el post esté bloqueado.
    const fromApi = resolveMediaUrl(p.cover_image_url);
    if (fromApi) return fromApi;
    if (this.isLocked()) return null;
    return extractFirstImageUrl(p.content_html);
  });

  readonly bodyHtml = computed<string | null>(() => {
    const p = this.post();
    if (!p || this.isLocked()) return null;
    const hasCover = !!(p.cover_image_url || extractFirstImageUrl(p.content_html));
    const rawRendered = toRenderableHtml(p.content_html, hasCover);
    return this.sanitizer.sanitize(SecurityContext.HTML, rawRendered);
  });

  readonly publishedLabel = computed(() => {
    const p = this.post();
    if (!p?.published_at) return '';
    const date = new Date(p.published_at);
    if (Number.isNaN(date.getTime())) return p.published_at;
    const locale = this.i18n.lang() === 'es' ? 'es-MX' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  readonly authorName = computed(
    () => this.post()?.author_name || this.handle() || this.t().athlete.athleteRole,
  );

  readonly unlockFragment = computed(() => 'support');

  readonly commentItems = computed(() => {
    const comments = this.post()?.comments || [];
    const locale = this.i18n.lang() === 'es' ? 'es-MX' : 'en-US';
    const currentUserId = this.authService.currentUser()?.id ?? null;
    return comments.map((c) => ({
      id: c.id,
      userId: c.user_id,
      userName: c.user_name,
      userAvatar: resolveMediaUrl(c.user_avatar) || c.user_avatar,
      content: c.content,
      createdAt: this.formatCommentDate(c.created_at, locale),
      isOwn: currentUserId != null && c.user_id === currentUserId,
    }));
  });

  constructor() {
    this.paramsSub = this.route.paramMap.subscribe((params) => {
      const nextHandle = params.get('username') || '';
      const nextPostId = params.get('postId') || '';
      this.handle.set(nextHandle);
      this.commentsOpen.set(false);
      this.newCommentText.set('');
      this.isCommenting.set(false);
      this.deletingCommentId.set(null);
      this.loadPost(nextHandle, nextPostId);
    });
  }

  ngOnDestroy(): void {
    this.paramsSub.unsubscribe();
  }

  toggleComments(): void {
    this.commentsOpen.update((v) => !v);
  }

  submitComment(): void {
    if (this.isLocked() || this.isCommenting()) return;
    const text = this.newCommentText().trim();
    if (!text) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: window.location.pathname },
      });
      return;
    }

    const current = this.post();
    if (!current) return;

    this.isCommenting.set(true);
    this.newCommentText.set('');
    this.supporterService.commentOnPost(current.id, text).subscribe({
      next: (comment: PostCommentDto) => {
        this.post.update((p) => {
          if (!p) return p;
          return {
            ...p,
            comments: [...(p.comments || []), comment],
          };
        });
        this.isCommenting.set(false);
        this.commentsOpen.set(true);
      },
      error: () => {
        this.isCommenting.set(false);
        this.newCommentText.set(text);
      },
    });
  }

  deleteComment(commentId: number): void {
    if (this.deletingCommentId() != null) return;
    const current = this.post();
    if (!current) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: window.location.pathname },
      });
      return;
    }

    this.deletingCommentId.set(commentId);
    this.supporterService.deleteComment(current.id, commentId).subscribe({
      next: () => {
        this.post.update((p) => {
          if (!p) return p;
          return {
            ...p,
            comments: (p.comments || []).filter((c) => c.id !== commentId),
          };
        });
        this.deletingCommentId.set(null);
      },
      error: () => {
        this.deletingCommentId.set(null);
      },
    });
  }

  private formatCommentDate(value: string, locale: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale);
  }

  private loadPost(handle: string, postId: string): void {
    if (!handle || !postId) {
      this.loading.set(false);
      this.errorMessage.set('Publicación no encontrada.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.post.set(null);

    this.exploreService.getCreatorPost(handle, postId).subscribe({
      next: (item) => {
        this.post.set(item);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.errorMessage.set('Esta publicación no existe o no está disponible.');
        } else {
          this.errorMessage.set('No se pudo cargar la publicación.');
        }
      },
    });
  }
}

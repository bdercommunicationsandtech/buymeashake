import { Component, computed, inject, OnDestroy, SecurityContext, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExploreService } from '../../../core/explore.service';
import { PostItemDto } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';
import { isSafeMediaUrl, resolveMediaUrl, resolveMediaUrlsInContent } from '../../../core/media-url';
import { IconLockComponent } from '../../../shared/icons';

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

  htmlBody = resolveMediaUrlsInContent(htmlBody);

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

  return htmlBody;
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, IconLockComponent],
  templateUrl: './post-detail.html',
})
export class PostDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly exploreService = inject(ExploreService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly i18n = inject(LanguageService);
  readonly t = this.i18n.t;
  private readonly paramsSub: Subscription;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly post = signal<PostItemDto | null>(null);
  readonly handle = signal('');

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

  constructor() {
    this.paramsSub = this.route.paramMap.subscribe((params) => {
      const nextHandle = params.get('username') || '';
      const nextPostId = params.get('postId') || '';
      this.handle.set(nextHandle);
      this.loadPost(nextHandle, nextPostId);
    });
  }

  ngOnDestroy(): void {
    this.paramsSub.unsubscribe();
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

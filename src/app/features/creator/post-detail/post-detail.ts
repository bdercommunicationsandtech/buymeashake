import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExploreService } from '../../../core/explore.service';
import { PostItemDto } from '../../../core/api.models';

function extractFirstImageUrl(content: string): string | null {
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch?.[1]) return htmlMatch[1];

  const mdMatch = content.match(/!\[[^\]]*]\(([^)\s]+)\)/);
  if (mdMatch?.[1]) return mdMatch[1];

  return null;
}

function stripFirstImage(content: string): string {
  return content
    .replace(/!\[[^\]]*]\(([^)\s]+)\)/, '')
    .replace(/<img[^>]*>/i, '')
    .trim();
}

function toRenderableHtml(content: string, stripLeadingImage = false): string {
  let html = (stripLeadingImage ? stripFirstImage(content) : content).trim();
  if (!html) return '';

  html = html.replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    const safeAlt = String(alt || 'Imagen').replace(/"/g, '&quot;');
    return `<img src="${src}" alt="${safeAlt}" loading="lazy" />`;
  });

  if (!html.includes('<')) {
    html = html
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
      .join('');
  }

  return html;
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-detail.html',
})
export class PostDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly exploreService = inject(ExploreService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly paramsSub: Subscription;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly post = signal<PostItemDto | null>(null);
  readonly handle = signal('');

  readonly coverImageUrl = computed(() => {
    const p = this.post();
    if (!p) return null;
    return extractFirstImageUrl(p.content_html);
  });

  readonly bodyHtml = computed<SafeHtml | null>(() => {
    const p = this.post();
    if (!p) return null;
    const hasCover = !!extractFirstImageUrl(p.content_html);
    return this.sanitizer.bypassSecurityTrustHtml(toRenderableHtml(p.content_html, hasCover));
  });

  readonly publishedLabel = computed(() => {
    const p = this.post();
    if (!p?.published_at) return '';
    const date = new Date(p.published_at);
    if (Number.isNaN(date.getTime())) return p.published_at;
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  readonly authorName = computed(
    () => this.post()?.author_name || this.handle() || 'Atleta',
  );

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
          this.errorMessage.set('Esta publicación no existe o no es pública.');
        } else {
          this.errorMessage.set('No se pudo cargar la publicación.');
        }
      },
    });
  }
}

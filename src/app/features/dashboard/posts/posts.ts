import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconButtonSupportComponent, IconLockComponent } from '../../../shared/icons';
import { DashboardService } from '../../../core/dashboard.service';
import { PostItemDto } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-dashboard-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, IconLockComponent, IconButtonSupportComponent],
  templateUrl: './posts.html',
})
export class DashboardPosts implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;

  readonly loading = signal(true);
  readonly showCreateModal = signal(false);
  readonly posts = signal<PostItemDto[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly deletingPostId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadPosts();
  }

  private loadPosts(): void {
    this.loading.set(true);
    this.dashboardService.getPosts().subscribe({
      next: (items) => {
        this.posts.set(items);
        this.loading.set(false);
        this.errorMessage.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        if (status === 401) {
          this.errorMessage.set(this.t().dashboard.postsView.sessionExpired);
        } else if (status === 403) {
          this.errorMessage.set(this.t().dashboard.postsView.noAthleteProfile);
        } else {
          this.errorMessage.set(this.t().dashboard.postsView.loadError);
        }
      },
    });
  }

  excerpt(post: PostItemDto): string {
    const text = post.content_html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = this.languageService.currentLang() === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  deletePost(post: PostItemDto): void {
    const confirmed = window.confirm(
      this.t().dashboard.postsView.deleteConfirm.replace('{title}', post.title),
    );
    if (!confirmed) return;

    this.deletingPostId.set(post.id);
    this.errorMessage.set(null);
    this.dashboardService.deletePost(post.id).subscribe({
      next: () => {
        this.posts.update((items) => items.filter((item) => item.id !== post.id));
        this.deletingPostId.set(null);
      },
      error: (err) => {
        this.deletingPostId.set(null);
        const apiMessage = err?.error?.error?.message || err?.error?.detail;
        if (err?.status === 401) {
          this.errorMessage.set(this.t().dashboard.postsView.sessionExpired);
        } else {
          this.errorMessage.set(apiMessage || this.t().dashboard.postsView.deleteFailedError);
        }
      },
    });
  }

  openCreate(): void {
    this.showCreateModal.set(true);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
  }
}

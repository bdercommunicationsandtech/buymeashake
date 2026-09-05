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

  ngOnInit(): void {
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
    const text = post.content_html.replace(/<[^>]+>/g, '').trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = this.languageService.currentLang() === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openCreate(): void {
    this.showCreateModal.set(true);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
  }
}

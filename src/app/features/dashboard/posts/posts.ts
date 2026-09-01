import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconButtonSupportComponent, IconLockComponent } from '../../../shared/icons';
import { DashboardService } from '../../../core/dashboard.service';
import { PostItemDto } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, IconLockComponent, IconButtonSupportComponent],
  templateUrl: './posts.html',
})
export class DashboardPosts implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly showCreateModal = signal(false);
  readonly posts = signal<PostItemDto[]>([]);

  ngOnInit(): void {
    this.dashboardService.getPosts().subscribe({
      next: (items) => {
        this.posts.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  excerpt(post: PostItemDto): string {
    const text = post.content_html.replace(/<[^>]+>/g, '').trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openCreate(): void {
    this.showCreateModal.set(true);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
  }
}

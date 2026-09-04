import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardService } from '../../../core/dashboard.service';
import { ThemeService } from '../../../core/theme.service';
import { AthleteProfileFull } from '../../../core/api.models';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
})
export class DashboardLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  readonly themeService = inject(ThemeService);
  readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly lang = this.languageService.lang;
  readonly t = this.languageService.t;

  readonly profile = signal<AthleteProfileFull | null>(null);
  readonly publishOpen = signal(true);
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);
  readonly notifMenuOpen = signal(false);
  readonly notifications = signal<any[]>([]);

  ngOnInit(): void {
    this.dashboardService.getProfile().subscribe({
      next: (prof) => this.profile.set(prof),
      error: () => {},
    });

    this.loadNotifications();
  }

  loadNotifications(): void {
    this.dashboardService.getNotifications().subscribe({
      next: (items) => this.notifications.set(items),
      error: () => {},
    });
  }

  toggleNotifMenu(): void {
    this.notifMenuOpen.update((v) => !v);
  }

  markAsRead(item: any): void {
    if (!item.is_read) {
      this.dashboardService.markNotificationRead(item.id).subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
          );
        },
      });
    }
    if (item.action_url) {
      this.router.navigateByUrl(item.action_url);
      this.notifMenuOpen.set(false);
    }
  }

  togglePublish(): void {
    this.publishOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

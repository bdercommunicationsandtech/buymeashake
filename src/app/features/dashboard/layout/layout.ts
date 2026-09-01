import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardService } from '../../../core/dashboard.service';
import { AthleteProfileFull } from '../../../core/api.models';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
})
export class DashboardLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  readonly profile = signal<AthleteProfileFull | null>(null);
  readonly publishOpen = signal(true);
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  ngOnInit(): void {
    this.dashboardService.getProfile().subscribe({
      next: (prof) => this.profile.set(prof),
      error: () => {},
    });
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
})
export class Header {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  readonly searchQuery = signal('');

  readonly links = [
    { path: '/explore', label: 'Explorar atletas' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
  }

  submitSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/explore'], { queryParams: { q } });
    } else {
      this.router.navigate(['/explore']);
    }
  }

  goToMyPanel(): void {
    const user = this.authService.currentUser();
    if (user?.role === 'supporter') {
      this.router.navigate(['/fan/home']);
    } else {
      this.router.navigate(['/dashboard/home']);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../chrome-controls/chrome-controls.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, BrandLogoComponent, ChromeControlsComponent],
  templateUrl: './header.html',
})
export class Header {
  readonly languageService = inject(LanguageService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly lang = this.languageService.lang;
  readonly t = this.languageService.t;

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
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

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
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

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }

  dashboardRoute(): string {
    return this.auth.getDefaultRoute();
  }
}

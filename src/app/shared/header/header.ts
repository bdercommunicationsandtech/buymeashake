import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
})
export class Header {
  readonly themeService = inject(ThemeService);
  readonly menuOpen = signal(false);
  readonly searchQuery = signal('');

  constructor(private router: Router) {}

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
}

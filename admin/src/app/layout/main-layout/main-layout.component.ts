import { UpperCasePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UpperCasePipe],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = signal(true);

  constructor(protected auth: AuthService) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      this.sidebarOpen.set(false);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}

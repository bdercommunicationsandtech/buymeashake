import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-supporter-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
})
export class SupporterLayout {
  readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}

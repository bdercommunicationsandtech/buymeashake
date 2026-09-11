import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../../../shared/chrome-controls/chrome-controls.component';

@Component({
  selector: 'app-supporter-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, BrandLogoComponent, ChromeControlsComponent],
  templateUrl: './layout.html',
})
export class SupporterLayout {
  readonly auth = inject(AuthService);
  readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.currentLang;
  readonly t = this.languageService.currentTranslations;

  logout(): void {
    this.auth.logout();
  }
}

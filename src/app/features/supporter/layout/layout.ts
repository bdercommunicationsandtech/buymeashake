import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-supporter-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
})
export class SupporterLayout {
  readonly auth = inject(AuthService);
  readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.currentLang;
  readonly t = this.languageService.currentTranslations;

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  logout(): void {
    this.auth.logout();
  }
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/language.service';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../chrome-controls/chrome-controls.component';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandLogoComponent, ChromeControlsComponent],
  templateUrl: './footer.html',
})
export class Footer {
  private readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.lang;
  readonly t = this.languageService.t;
  readonly year = new Date().getFullYear();

  readonly columns = computed(() => {
    const t = this.t();
    return [
      {
        title: t.footer.product,
        links: [
          { path: '/', label: t.footer.home },
          { path: '/explore', label: t.footer.explore },
          { path: '/auth/login', label: t.footer.login },
        ],
      },
      {
        title: t.footer.forAthletes,
        links: [
          { path: '/auth/register', label: t.footer.createPage },
          { path: '/dashboard/home', label: t.footer.dashboard },
        ],
      },
      {
        title: t.footer.legal,
        links: [
          { path: '/terms', label: t.footer.terms },
          { path: '/privacy', label: t.footer.privacy },
          { path: '/report', label: t.footer.report },
          { path: '/contact', label: t.footer.support },
        ],
      },
    ];
  });
}

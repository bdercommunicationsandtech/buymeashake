import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  private readonly languageService = inject(LanguageService);
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
          { path: '/dashboard/referrals', label: t.footer.referrals },
        ],
      },
    ];
  });
}

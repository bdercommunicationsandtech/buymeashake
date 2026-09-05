import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconBoltComponent } from '../../../shared/icons';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-dashboard-integrations',
  standalone: true,
  imports: [CommonModule, IconBoltComponent],
  templateUrl: './integrations.html',
})
export class DashboardIntegrations {
  private readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;
}


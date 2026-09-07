import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-buttons-graphics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buttons-graphics.html',
})
export class DashboardButtonsGraphics {
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;
}

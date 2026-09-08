import { Component, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/language.service';

interface LegalSection {
  id: string;
  titleEs: string;
  titleEn: string;
}

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy.html',
})
export class PrivacyPolicy implements AfterViewInit, OnDestroy {
  private readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.lang;
  readonly activeSection = signal<string>('responsible');

  private isManualScrolling = false;
  private scrollTimeout: any = null;

  readonly sections: LegalSection[] = [
    { id: 'responsible', titleEs: '1. Responsable del Tratamiento', titleEn: '1. Data Controller & Scope' },
    { id: 'data-collected', titleEs: '2. Datos Personales Recabados', titleEn: '2. Data We Collect' },
    { id: 'health-data', titleEs: '3. Datos de Salud y Rendimiento', titleEn: '3. Health & Fitness Data' },
    { id: 'payments-security', titleEs: '4. Pagos y Stripe Connect', titleEn: '4. Payments & Stripe Connect' },
    { id: 'sessions-privacy', titleEs: '5. Videollamadas 1-a-1 y Agenda', titleEn: '5. 1-on-1 Calls & Scheduling' },
    { id: 'purposes', titleEs: '6. Finalidades del Tratamiento', titleEn: '6. Purposes of Processing' },
    { id: 'cookies-storage', titleEs: '7. Cookies y Almacenamiento', titleEn: '7. Cookies & Local Storage' },
    { id: 'user-rights', titleEs: '8. Derechos ARCO y Supresión', titleEn: '8. User Rights & Data Deletion' },
    { id: 'international-retention', titleEs: '9. Transferencias y Retención', titleEn: '9. Transfers & Retention' },
    { id: 'contact-updates', titleEs: '10. Contacto y Modificaciones', titleEn: '10. Contact & Policy Updates' },
  ];

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      setTimeout(() => this.onScroll(), 100);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  private onScroll = (): void => {
    if (this.isManualScrolling || typeof window === 'undefined') return;

    // Si el usuario llega al final del documento, activar la última sección
    const scrollBottom = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollBottom >= documentHeight - 70) {
      const last = this.sections[this.sections.length - 1];
      if (last && this.activeSection() !== last.id) {
        this.activeSection.set(last.id);
      }
      return;
    }

    const threshold = window.scrollY + 180;
    const sectionElements = this.sections
      .map((s) => {
        const el = document.getElementById(s.id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          id: s.id,
          top: rect.top + window.scrollY,
        };
      })
      .filter((s): s is { id: string; top: number } => s !== null);

    let current = sectionElements[0]?.id || 'responsible';
    for (const item of sectionElements) {
      if (item.top <= threshold) {
        current = item.id;
      } else {
        break;
      }
    }

    if (current && this.activeSection() !== current) {
      this.activeSection.set(current);
    }
  };

  scrollTo(id: string): void {
    this.activeSection.set(id);
    this.isManualScrolling = true;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.scrollTimeout = setTimeout(() => {
      this.isManualScrolling = false;
    }, 800);
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
    setTimeout(() => this.onScroll(), 150);
  }
}

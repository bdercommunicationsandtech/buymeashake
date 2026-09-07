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
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms.html',
})
export class TermsOfService implements AfterViewInit, OnDestroy {
  private readonly languageService = inject(LanguageService);
  readonly lang = this.languageService.lang;
  readonly activeSection = signal<string>('intro');

  private isManualScrolling = false;
  private scrollTimeout: any = null;

  readonly sections: LegalSection[] = [
    { id: 'intro', titleEs: '1. Introducción y Partes', titleEn: '1. Introduction & Agreement' },
    { id: 'accounts', titleEs: '2. Creación de Cuentas y Roles', titleEn: '2. Account Creation & Roles' },
    { id: 'health-disclaimer', titleEs: '3. Deslinde Médico y Deportivo', titleEn: '3. Health & Fitness Disclaimer' },
    { id: 'prohibited', titleEs: '4. Conductas y Política Antidopaje', titleEn: '4. Prohibited Conduct & Anti-Doping' },
    { id: 'monetization', titleEs: '5. Los 4 Pilares de Monetización', titleEn: '5. Four Monetization Pillars' },
    { id: 'payments', titleEs: '6. Tarifas, Stripe y Retiros', titleEn: '6. Fees, Stripe & Payouts' },
    { id: 'intellectual-property', titleEs: '7. Propiedad Intelectual y Rutinas', titleEn: '7. Intellectual Property & Plans' },
    { id: 'refunds-cancellations', titleEs: '8. Cancelaciones y No-Show', titleEn: '8. Cancellations & No-Show Policy' },
    { id: 'dormancy-deletion', titleEs: '9. Inactividad y Borrado de Cuenta', titleEn: '9. Inactivity & Account Deletion' },
    { id: 'liability-disputes', titleEs: '10. Responsabilidad y Controversias', titleEn: '10. Liability & Dispute Resolution' },
  ];

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      // Chequeo inicial
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

    // Umbral de detección: ~180px por debajo del scroll actual (descontando header)
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

    let current = sectionElements[0]?.id || 'intro';
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

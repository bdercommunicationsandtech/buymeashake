import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconCalendarComponent, IconPackageComponent } from '../../../shared/icons';
import { DashboardService } from '../../../core/dashboard.service';

export interface DigitalProduct {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Plantilla';
  price: number;
  currency: 'USD' | 'MXN';
  sales: number;
  description: string;
  gradient: string;
}

export interface BookingService {
  id: string;
  title: string;
  durationMinutes: number;
  price: number;
  currency: 'USD' | 'MXN';
  platform: 'Google Meet' | 'Zoom' | 'WhatsApp Video';
  description: string;
  activeDays: string[];
  slotsCount: number;
}

export interface ScheduledSession {
  athleteName: string;
  date: string;
  time: string;
  serviceTitle: string;
  meetingLink: string;
  status: 'Confirmada' | 'En espera' | 'Completada';
}

@Component({
  selector: 'app-dashboard-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, IconPackageComponent, IconCalendarComponent],
  templateUrl: './shop.html',
})
export class DashboardShop implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly activeTab = signal<'products' | 'bookings' | 'calendar'>('products');
  readonly showProductModal = signal(false);
  readonly showBookingModal = signal(false);
  readonly loading = signal(false);
  readonly uploadingFile = signal(false);

  // Formulario Producto
  newProductTitle = '';
  newProductDesc = '';
  newProductPrice = 19.99;
  newProductType = 'PDF';
  newProductFileUrl = '';

  // Formulario Booking
  newBookingTitle = '';
  newBookingDesc = '';
  newBookingDuration = 45;
  newBookingPrice = 35.0;

  readonly products = signal<DigitalProduct[]>([
    {
      id: '1',
      title: 'Guía de Hipertrofia & Fuerza (12 Semanas)',
      type: 'PDF',
      price: 19.99,
      currency: 'USD',
      sales: 24,
      description: 'Plan estructurado de 4 días por semana con progresiones de sobrecarga y videos explicativos.',
      gradient: 'from-emerald-600 to-teal-500',
    },
    {
      id: '2',
      title: 'Plantilla de Registro de Levantamientos (Notion)',
      type: 'Plantilla',
      price: 9.99,
      currency: 'USD',
      sales: 42,
      description: 'Calculadora automática de 1RM, volumen de entrenamiento y RPE semanal.',
      gradient: 'from-blue-600 to-indigo-600',
    },
  ]);

  readonly bookingServices = signal<BookingService[]>([
    {
      id: 'b1',
      title: 'Revisión de Técnica 1-a-1 en Vivo',
      durationMinutes: 45,
      price: 35.0,
      currency: 'USD',
      platform: 'Google Meet',
      description: 'Videollamada privada donde analizamos tus levantamientos, biomecánica y corregimos puntos de estancamiento.',
      activeDays: ['Lun', 'Mié', 'Vie'],
      slotsCount: 8,
    },
    {
      id: 'b2',
      title: 'Asesoría de Programación y Periodización',
      durationMinutes: 60,
      price: 50.0,
      currency: 'USD',
      platform: 'Google Meet',
      description: 'Diseño conjunto de tu siguiente bloque de entrenamiento de cara a competencia o marcas personales.',
      activeDays: ['Mar', 'Jue', 'Sáb'],
      slotsCount: 5,
    },
  ]);

  readonly scheduledSessions = signal<ScheduledSession[]>([
    {
      athleteName: 'Carlos Mendoza',
      date: 'Mañana, 01 Septiembre',
      time: '18:00 - 18:45',
      serviceTitle: 'Revisión de Técnica 1-a-1 en Vivo',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      status: 'Confirmada',
    },
    {
      athleteName: 'Mariana Cruz',
      date: 'Jueves, 03 Septiembre',
      time: '10:00 - 11:00',
      serviceTitle: 'Asesoría de Programación y Periodización',
      meetingLink: 'https://meet.google.com/xyz-uvwx-rst',
      status: 'Confirmada',
    },
  ]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Cargar productos de backend
    this.dashboardService.getProducts().subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          const mapped: DigitalProduct[] = items.map((p) => ({
            id: String(p.id),
            title: p.title,
            type: p.file_type === 'PDF' ? 'PDF' : p.file_type === 'Template_Notion' ? 'Plantilla' : 'Video',
            price: Number(p.price),
            currency: (p.currency as 'USD' | 'MXN') || 'USD',
            sales: 0,
            description: p.description || '',
            gradient: 'from-emerald-600 to-teal-500',
          }));
          this.products.set(mapped);
        }
      },
      error: () => {},
    });

    // Cargar servicios de videollamada de backend
    this.dashboardService.getBookingServices().subscribe({
      next: (services) => {
        if (services && services.length > 0) {
          const mapped: BookingService[] = services.map((s) => ({
            id: String(s.id),
            title: s.title,
            durationMinutes: s.duration_minutes,
            price: Number(s.price),
            currency: (s.currency as 'USD' | 'MXN') || 'USD',
            platform: 'Google Meet',
            description: s.description || '',
            activeDays: ['Lun', 'Mié', 'Vie'],
            slotsCount: 6,
          }));
          this.bookingServices.set(mapped);
        }
      },
      error: () => {},
    });
  }

  setTab(tab: 'products' | 'bookings' | 'calendar'): void {
    this.activeTab.set(tab);
  }

  openProductModal(): void {
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
  }

  openBookingModal(): void {
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingFile.set(true);

    this.dashboardService.uploadProductFile(file).subscribe({
      next: (res) => {
        this.uploadingFile.set(false);
        this.newProductFileUrl = res.url;
      },
      error: () => {
        this.uploadingFile.set(false);
      },
    });
  }

  createProduct(): void {
    if (!this.newProductTitle || this.newProductPrice <= 0) return;

    this.dashboardService.createProduct({
      title: this.newProductTitle,
      description: this.newProductDesc,
      price: this.newProductPrice,
      currency: 'USD',
      file_type: this.newProductType === 'PDF' ? 'PDF' : 'Template_Notion',
      file_url: this.newProductFileUrl || 'https://buymeashake.fit/sample.pdf',
    }).subscribe({
      next: (p) => {
        this.products.update((prev) => [
          {
            id: String(p.id),
            title: p.title,
            type: p.file_type === 'PDF' ? 'PDF' : 'Plantilla',
            price: Number(p.price),
            currency: 'USD',
            sales: 0,
            description: p.description || '',
            gradient: 'from-indigo-600 to-purple-600',
          },
          ...prev,
        ]);
        this.closeProductModal();
      },
      error: () => {},
    });
  }

  createBooking(): void {
    if (!this.newBookingTitle || this.newBookingPrice <= 0) return;

    this.dashboardService.getBookingServices().subscribe({
      next: () => {
        this.bookingServices.update((prev) => [
          {
            id: String(Date.now()),
            title: this.newBookingTitle,
            durationMinutes: this.newBookingDuration,
            price: this.newBookingPrice,
            currency: 'USD',
            platform: 'Google Meet',
            description: this.newBookingDesc,
            activeDays: ['Lun', 'Mié', 'Vie'],
            slotsCount: 6,
          },
          ...prev,
        ]);
        this.closeBookingModal();
      },
      error: () => {},
    });
  }
}

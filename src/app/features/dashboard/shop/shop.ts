import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  status: 'Confirmada' | 'Pendiente';
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop.html',
})
export class DashboardShop {
  readonly activeTab = signal<'products' | 'bookings' | 'calendar'>('products');
  readonly showProductModal = signal(false);
  readonly showBookingModal = signal(false);

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
}

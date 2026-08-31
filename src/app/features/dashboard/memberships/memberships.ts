import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MembershipTier {
  id: string;
  name: string;
  monthlyPrice: number;
  currency: 'USD' | 'MXN';
  description: string;
  benefits: string[];
  membersCount: number;
  featured: boolean;
}

@Component({
  selector: 'app-dashboard-memberships',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memberships.html',
})
export class DashboardMemberships {
  readonly enabled = signal(true);
  readonly showCreateModal = signal(false);

  readonly tiers = signal<MembershipTier[]>([
    {
      id: 't1',
      name: 'Nivel Atleta (Comunidad)',
      monthlyPrice: 5,
      currency: 'USD',
      description: 'Acceso a la comunidad privada y publicaciones exclusivas de entrenamientos.',
      benefits: [
        'Acceso al canal privado de Discord / Telegram',
        'Posts y videos de técnica exclusivos',
        'Insignia de Supporter Oficial en tu perfil',
      ],
      membersCount: 38,
      featured: false,
    },
    {
      id: 't2',
      name: 'Nivel Pro (Rutinas & Q&A)',
      monthlyPrice: 15,
      currency: 'USD',
      description: 'Bloques de entrenamiento semanales y sesión mensual de preguntas y respuestas en vivo.',
      benefits: [
        'Todos los beneficios del Nivel Atleta',
        'Descarga libre de todos mis PDFs de rutinas',
        'Sesión grupal mensual de Q&A en Google Meet',
        'Descuento del 20% en asesorías 1-a-1',
      ],
      membersCount: 22,
      featured: true,
    },
    {
      id: 't3',
      name: 'Nivel Élite (Asesoría Directa)',
      monthlyPrice: 45,
      currency: 'USD',
      description: 'Acompañamiento cercano y revisión mensual personalizada de levantamientos.',
      benefits: [
        'Todos los beneficios de los niveles anteriores',
        'Revisión mensual de técnica por videollamada',
        'Contacto directo por WhatsApp para dudas',
      ],
      membersCount: 9,
      featured: false,
    },
  ]);

  toggleMembership(): void {
    this.enabled.update((v) => !v);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonSupportComponent, IconLockComponent } from '../../../shared/icons';

export interface CreatorPost {
  title: string;
  excerpt: string;
  date: string;
  likes: number;
  type: 'public' | 'members-only';
}

@Component({
  selector: 'app-dashboard-posts',
  standalone: true,
  imports: [CommonModule, IconLockComponent, IconButtonSupportComponent],
  templateUrl: './posts.html',
})
export class DashboardPosts {
  readonly showCreateModal = signal(false);
  readonly postType = signal<'public' | 'members-only'>('public');

  readonly posts = signal<CreatorPost[]>([
    {
      title: 'Semana de Descarga: Por qué es clave para ganar fuerza',
      excerpt: 'Muchos cometen el error de entrenar al fallo 52 semanas al año. Aquí te explico mi protocolo de deload...',
      date: 'Hace 3 días',
      likes: 28,
      type: 'public',
    },
    {
      title: 'Rutina exclusiva de movilidad para sentadilla profunda',
      excerpt: 'Bloque completo de 15 minutos para tobillos y cadera antes de día pesado de piernas.',
      date: 'Hace 1 semana',
      likes: 45,
      type: 'members-only',
    },
  ]);

  openCreate(): void {
    this.showCreateModal.set(true);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
  }
}

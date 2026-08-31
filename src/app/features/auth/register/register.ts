import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  readonly handle = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly selectedSport = signal('Fuerza & Gym');

  readonly sports = [
    'Fuerza & Gym',
    'CrossFit',
    'Running',
    'Ciclismo',
    'Yoga & Movilidad',
    'Nutrición',
    'Calistenia',
    'Artes Marciales / Boxeo',
  ];

  constructor(private router: Router) {}

  onHandleInput(val: string): void {
    this.handle.set(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }

  submit(): void {
    // Redirigir al dashboard tras simular registro
    this.router.navigate(['/dashboard/home']);
  }
}

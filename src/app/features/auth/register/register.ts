import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LookupService } from '../../../core/lookup.service';
import { LookupItemDto } from '../../../core/api.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lookupService = inject(LookupService);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (this.auth.isAuthenticated() && user) {
        void this.router.navigateByUrl(this.auth.getDefaultRoute());
      }
    });
  }

  readonly handle = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly selectedSportCode = signal<number>(101);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly sports = signal<LookupItemDto[]>([]);

  ngOnInit(): void {
    this.lookupService.getSportDisciplines().subscribe({
      next: (items) => {
        this.sports.set(items);
        if (items.length > 0) {
          this.selectedSportCode.set(items[0].code);
        }
      },
      error: () => {},
    });
  }

  onHandleInput(val: string): void {
    this.handle.set(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }

  submit(): void {
    if (!this.email() || !this.password() || !this.name() || !this.handle()) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    if (this.password().length < 8) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth
      .register({
        email: this.email(),
        password: this.password(),
        full_name: this.name(),
        role: 'athlete',
        handle: this.handle(),
        primary_sport_code: this.selectedSportCode(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/onboarding']);
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err.error?.error?.message ||
            'Error al crear la cuenta. Verifica que el correo o @handle no estén en uso.';
          this.errorMessage.set(msg);
        },
      });
  }
}

import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Creator } from '../../creator/creator';

@Component({
  selector: 'app-edit-my-page',
  standalone: true,
  imports: [Creator, RouterLink],
  template: `
    @if (handle()) {
      <div class="sticky top-0 z-40 border-b border-white/10 bg-[#090c0a]/90 backdrop-blur-md">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <p class="text-xs font-bold text-white/80">
            Estás editando tu página pública. Usa los lápices para cambiar cada sección.
          </p>
          <a
            [routerLink]="['/', handle()]"
            class="shrink-0 text-xs font-black text-[#c9ff3d] hover:underline"
          >Ver como visitante ↗</a>
        </div>
      </div>
      <app-creator [username]="handle()!" [editMode]="true" />
    } @else {
      <div class="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-gray-500">
        Cargando tu página…
      </div>
    }
  `,
})
export class EditMyPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly handle = computed(() => this.auth.currentUser()?.athlete_handle || '');

  constructor() {
    const user = this.auth.currentUser();
    if (user && !user.athlete_handle) {
      void this.router.navigateByUrl('/dashboard/home');
    }
  }
}

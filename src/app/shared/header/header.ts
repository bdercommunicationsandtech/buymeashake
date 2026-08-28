import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
})
export class Header {
  readonly menuOpen = signal(false);

  readonly links = [
    { path: '/', label: 'Inicio' },
    { path: '/widget', label: 'Laboratorio' },
    { path: '/sofia', label: 'Perfil demo' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}

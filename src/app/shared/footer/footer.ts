import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly year = new Date().getFullYear();

  readonly columns = [
    {
      title: 'Producto',
      links: [
        { path: '/', label: 'Inicio' },
        { path: '/explore', label: 'Explorar atletas' },
        { path: '/auth/login', label: 'Iniciar sesión' },
      ],
    },
    {
      title: 'Para atletas',
      links: [
        { path: '/auth/register', label: 'Crear mi página' },
        { path: '/dashboard/home', label: 'Panel de control' },
        { path: '/dashboard/referrals', label: 'Programa de referidos' },
      ],
    },
  ];
}

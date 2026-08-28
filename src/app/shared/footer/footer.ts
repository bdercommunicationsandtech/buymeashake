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
        { path: '/widget', label: 'Laboratorio de widgets' },
        { path: '/sofia', label: 'Perfil demo' },
      ],
    },
    {
      title: 'Para atletas',
      links: [
        { path: '/sofia', label: 'Metas de recaudación' },
        { path: '/widget', label: 'Incrustar en tu web' },
        { path: '/', label: 'Cómo funciona' },
      ],
    },
  ];
}

# buymeashake.fit — prototipo v1.0

Prototipo visual de una plataforma de apoyo tipo *buy me a coffee* pensada para el mundo del
fitness: la comunidad invita **shakes de proteína** a coaches, atletas y creadores de contenido
deportivo.

> Es una maqueta interactiva. **No procesa pagos reales**: el checkout replica el diseño de Stripe
> Elements únicamente para validar el flujo y la interfaz.

## Stack

| Pieza      | Versión / herramienta                         |
| ---------- | --------------------------------------------- |
| Framework  | Angular 21 (componentes standalone + signals) |
| Estilos    | Tailwind CSS v4 vía PostCSS                   |
| Tests      | Vitest (`@angular/build:unit-test`)           |
| Gestor     | pnpm                                          |

## Puesta en marcha

```bash
pnpm install
pnpm start        # http://localhost:4200
```

Otros comandos:

```bash
pnpm build        # build de producción en dist/
pnpm test         # suite de Vitest
```

### Si `pnpm install` falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

En redes con inspección TLS (proxy corporativo o antivirus), Node no confía en el certificado
del intermediario aunque Windows sí lo tenga instalado. Ejecuta la instalación pidiéndole a Node
que use el almacén de certificados del sistema:

```powershell
$env:NODE_OPTIONS="--use-system-ca"; pnpm install
```

Sólo afecta a las descargas: `pnpm start`, `pnpm build` y `pnpm test` no necesitan red.

## Estructura

```
src/
  styles.css                        Tema global: paleta, tipografía y @keyframes de las figuras
  app/
    core/
      demo.ts                       Actividades, creador demo y apoyos recientes
      checkout.service.ts           Estado del flujo de apoyo (signals)
    shared/
      sport-widget/                 Widget interactivo (shaker + carrusel tras interruptor)
      stripe-checkout/              Overlay con el diseño de Stripe
      header/ footer/               Layout global
    features/
      home/                         Landing
      creator/                      Perfil del creador y panel de apoyo
      widget-lab/                   Laboratorio del widget + snippet de embed
```

## Rutas

| Ruta      | Vista                                     |
| --------- | ----------------------------------------- |
| `/`       | Landing con el widget en el hero          |
| `/widget` | Laboratorio de widgets y código de embed  |
| `/sofia`  | Perfil de la coach demo y flujo de apoyo  |

## El widget deportivo

Hecho con SVG y animaciones CSS, sin librerías externas. Hoy muestra únicamente el
shaker en grande y sólo se anima cuando el usuario interactúa con él:

- **Cursor encima**: el shaker se agita mientras el puntero está sobre el escenario.
- **Arrastre**: mantener pulsado y mover acelera el vaivén (`PointerEvent`); al soltar
  sigue agitándose ~0.9 s por inercia.
- **Teclado**: `Tab` para enfocar y `espacio` o `Enter` para lanzar un agitón.
- **Reposo**: sin interacción la figura vuelve a su pose vertical y no anima nada.

### Carrusel de actividades (en pausa)

Las otras seis figuras (sentadilla, correr, salto de cuerda, ciclismo, press militar y
cross training) siguen implementadas junto a sus controles: chips, flechas, rotación
automática con intervalo ajustable y navegación con `←` / `→`. Están ocultas tras el
interruptor `SPORT_WIDGET_CAROUSEL_ENABLED` en
`src/app/shared/sport-widget/sport-widget.ts`; ponerlo en `true` las devuelve, junto con
las opciones correspondientes del laboratorio.

Respeta `prefers-reduced-motion`: si el sistema pide menos animación, las figuras se detienen.

## Cómo probar el checkout

1. Entra a `/sofia`.
2. Elige `3 shakes` (o escribe una cantidad), agrega un mensaje y pulsa **Apoyar $9**.
3. En el overlay, escribe dígitos en la tarjeta: se agrupan de 4 en 4 y la fecha se formatea a
   `MM/AA` automáticamente.
4. Pulsa **Pagar**: verás el estado *Procesando…* y luego la confirmación.
5. **Volver al prototipo** cierra el overlay (también funciona `Esc`).

## Pendiente para la versión real

- Backend con Stripe (PaymentIntents, webhooks y payouts a los creadores).
- Autenticación, alta de creadores y panel de administración.
- Endpoint real de `/embed/:handle` para el widget incrustable.
- Persistencia de metas, apoyos y mensajes.

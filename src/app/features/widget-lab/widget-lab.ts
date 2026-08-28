import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../core/checkout.service';
import { ACTIVITIES, Activity, DEMO_CREATOR } from '../../core/demo';
import {
  SPORT_WIDGET_CAROUSEL_ENABLED,
  SportWidget,
} from '../../shared/sport-widget/sport-widget';

type WidgetTheme = 'dark' | 'light';
type CopyStatus = 'idle' | 'copied' | 'error';

/** Reserva para navegadores que bloquean la Clipboard API sin gesto directo. */
function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';

  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();

  return copied;
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

@Component({
  selector: 'app-widget-lab',
  imports: [SportWidget],
  templateUrl: './widget-lab.html',
})
export class WidgetLab {
  private readonly checkout = inject(CheckoutService);

  readonly creator = DEMO_CREATOR;
  readonly activities = ACTIVITIES;
  readonly showCarouselOptions = SPORT_WIDGET_CAROUSEL_ENABLED;

  readonly activity = signal<Activity>(ACTIVITIES[0]);
  readonly theme = signal<WidgetTheme>('dark');
  readonly withControls = signal(true);
  readonly autoplay = signal(true);
  readonly copyStatus = signal<CopyStatus>('idle');

  readonly copyLabel = computed(() => {
    const status = this.copyStatus();
    if (status === 'copied') return '¡Copiado!';
    if (status === 'error') return 'Copia manual';
    return 'Copiar';
  });

  readonly snippet = computed(() => {
    const params = [`figure=${this.activity().id}`, `theme=${this.theme()}`, 'trigger=hover'];
    if (this.showCarouselOptions) {
      params.push(`controls=${this.withControls()}`, `autoplay=${this.autoplay()}`);
    }

    return [
      '<!-- buymeashake.fit · widget deportivo -->',
      '<iframe',
      `  src="https://buymeashake.fit/embed/${this.creator.handle}?${params.join('&')}"`,
      '  width="380"',
      '  height="520"',
      '  style="border:0;border-radius:28px;overflow:hidden"',
      `  title="Invítale un shake a @${this.creator.handle}"`,
      '  loading="lazy"',
      '></iframe>',
      '<script async src="https://buymeashake.fit/embed.js"></script>',
    ].join('\n');
  });

  readonly checks = [
    {
      title: 'Pasar el cursor',
      detail: 'El shaker empieza a agitarse solo mientras el puntero está encima y se detiene al salir.',
    },
    {
      title: 'Agitarlo',
      detail: 'Mantén pulsado y arrastra sobre el shaker: el vaivén se acelera y sigue un momento al soltar.',
    },
    {
      title: 'Teclado',
      detail: 'Enfoca el escenario con Tab y pulsa espacio o Enter para lanzar un agitón.',
    },
    {
      title: 'Reposo',
      detail: 'Sin interacción el shaker queda quieto y vertical, para no distraer del resto de la página.',
    },
  ];

  onActivityChange(activity: Activity): void {
    this.activity.set(activity);
  }

  setTheme(theme: WidgetTheme): void {
    this.theme.set(theme);
  }

  toggleControls(): void {
    this.withControls.update((value) => !value);
  }

  toggleAutoplay(): void {
    this.autoplay.update((value) => !value);
  }

  async copySnippet(): Promise<void> {
    const copied = await writeToClipboard(this.snippet());
    this.copyStatus.set(copied ? 'copied' : 'error');
    setTimeout(() => this.copyStatus.set('idle'), 2200);
  }

  previewCheckout(): void {
    this.checkout.start({
      creatorName: this.creator.name,
      creatorHandle: this.creator.handle,
      shakes: 1,
      message: `Probado desde el laboratorio con la figura “${this.activity().name}”`,
      activity: this.activity().id,
    });
  }
}

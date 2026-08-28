import { Injectable, computed, signal } from '@angular/core';
import { ActivityId, SHAKE_PRICE } from './demo';

export interface CheckoutDraft {
  readonly creatorName: string;
  readonly creatorHandle: string;
  readonly shakes: number;
  readonly unitPrice: number;
  readonly message: string;
  readonly activity: ActivityId;
}

export interface CheckoutRequest {
  readonly creatorName: string;
  readonly creatorHandle: string;
  readonly shakes: number;
  readonly message?: string;
  readonly activity?: ActivityId;
  readonly unitPrice?: number;
}

/**
 * Estado compartido del flujo de apoyo. No procesa cobros: sólo orquesta la
 * apertura del overlay de Stripe y la pantalla de confirmación del prototipo.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly _open = signal(false);
  private readonly _paid = signal(false);
  private readonly _draft = signal<CheckoutDraft | null>(null);

  readonly open = this._open.asReadonly();
  readonly paid = this._paid.asReadonly();
  readonly draft = this._draft.asReadonly();

  readonly total = computed(() => {
    const draft = this._draft();
    if (!draft) return 0;
    return draft.shakes * draft.unitPrice;
  });

  start(request: CheckoutRequest): void {
    const shakes = Math.min(Math.max(Math.round(request.shakes) || 1, 1), 99);

    this._draft.set({
      creatorName: request.creatorName,
      creatorHandle: request.creatorHandle,
      shakes,
      unitPrice: request.unitPrice ?? SHAKE_PRICE,
      message: request.message?.trim() ?? '',
      activity: request.activity ?? 'shaker',
    });
    this._paid.set(false);
    this._open.set(true);
  }

  markPaid(): void {
    this._paid.set(true);
  }

  close(): void {
    this._open.set(false);
    this._paid.set(false);
  }
}

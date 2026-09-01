import { Injectable, computed, signal } from '@angular/core';
import { ActivityId, SHAKE_PRICE } from './demo';

export type CheckoutType = 'shake' | 'membership' | 'product' | 'booking';

export interface CheckoutDraft {
  readonly type?: CheckoutType;
  readonly creatorName: string;
  readonly creatorHandle: string;
  readonly title?: string;
  readonly shakes: number;
  readonly unitPrice: number;
  readonly currency: 'USD' | 'MXN';
  readonly message: string;
  readonly activity: ActivityId;
  readonly downloadUrl?: string;
  readonly bookingDetails?: {
    date: string;
    time: string;
    platform: string;
    meetingLink?: string;
  };
}

export interface CheckoutRequest {
  readonly type?: CheckoutType;
  readonly creatorName: string;
  readonly creatorHandle: string;
  readonly title?: string;
  readonly shakes?: number;
  readonly message?: string;
  readonly activity?: ActivityId;
  readonly unitPrice?: number;
  readonly currency?: 'USD' | 'MXN';
  readonly downloadUrl?: string;
  readonly bookingDetails?: {
    date: string;
    time: string;
    platform: string;
    meetingLink?: string;
  };
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
    const shakes = Math.min(Math.max(Math.round(request.shakes ?? 1) || 1, 1), 99);

    this._draft.set({
      type: request.type ?? 'shake',
      creatorName: request.creatorName,
      creatorHandle: request.creatorHandle,
      title: request.title,
      shakes,
      unitPrice: request.unitPrice ?? SHAKE_PRICE,
      currency: request.currency ?? 'USD',
      message: request.message?.trim() ?? '',
      activity: request.activity ?? 'shaker',
      downloadUrl: request.downloadUrl,
      bookingDetails: request.bookingDetails,
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

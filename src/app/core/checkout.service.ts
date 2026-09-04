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
  readonly currency: 'USD';
  readonly supporterName?: string;
  readonly isAnonymous?: boolean;
  readonly message: string;
  readonly activity: ActivityId;
  readonly tierId?: number;
  readonly downloadUrl?: string;
  readonly paymentClientSecret?: string;
  readonly transactionUuid?: string;
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
  readonly supporterName?: string;
  readonly isAnonymous?: boolean;
  readonly message?: string;
  readonly activity?: ActivityId;
  readonly unitPrice?: number;
  readonly currency?: 'USD';
  readonly tierId?: number;
  readonly downloadUrl?: string;
  readonly paymentClientSecret?: string;
  readonly transactionUuid?: string;
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
  private readonly _confirming = signal(false);
  private readonly _draft = signal<CheckoutDraft | null>(null);

  readonly open = this._open.asReadonly();
  readonly paid = this._paid.asReadonly();
  readonly confirming = this._confirming.asReadonly();
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
      supporterName: request.supporterName,
      isAnonymous: request.isAnonymous ?? false,
      message: request.message?.trim() ?? '',
      activity: request.activity ?? 'shaker',
      tierId: request.tierId,
      downloadUrl: request.downloadUrl,
      paymentClientSecret: request.paymentClientSecret,
      transactionUuid: request.transactionUuid,
      bookingDetails: request.bookingDetails,
    });
    this._paid.set(false);
    this._confirming.set(false);
    this.thankYouMessage.set(null);
    this._open.set(true);
  }

  /**
   * Abre el overlay en modo carga al volver de Stripe (page reload).
   * Muestra shaker batiéndose hasta que markPaid() confirme el pago.
   */
  beginStripeReturn(partial?: {
    creatorName?: string;
    creatorHandle?: string;
    type?: CheckoutType;
    shakes?: number;
  }): void {
    this._draft.set({
      type: partial?.type ?? 'shake',
      creatorName: partial?.creatorName ?? 'Atleta',
      creatorHandle: partial?.creatorHandle ?? '',
      shakes: Math.min(Math.max(partial?.shakes ?? 1, 1), 99),
      unitPrice: SHAKE_PRICE,
      currency: 'USD',
      message: '',
      activity: 'shaker',
    });
    this._paid.set(false);
    this.thankYouMessage.set(null);
    this._confirming.set(true);
    this._open.set(true);
  }

  readonly thankYouMessage = signal<string | null>(null);

  private readonly _lastDonation = signal<{ supporterItem?: any; newGoalRaised?: number | null } | null>(null);
  readonly lastDonation = this._lastDonation.asReadonly();

  markPaid(supporterItem?: any, newGoalRaised?: number | null, thankYouMessage?: string | null): void {
    this._confirming.set(false);
    this._paid.set(true);
    if (!this._open()) {
      this._open.set(true);
    }
    if (thankYouMessage) {
      this.thankYouMessage.set(thankYouMessage);
    }
    if (supporterItem || newGoalRaised) {
      this._lastDonation.set({ supporterItem, newGoalRaised });
    }
  }

  close(): void {
    if (this._confirming()) return;
    this._open.set(false);
    this._paid.set(false);
    this._confirming.set(false);
    this.thankYouMessage.set(null);
  }

  /** Cierra incluso en modo confirming (p.ej. fallo al verificar Stripe). */
  abortConfirming(): void {
    this._confirming.set(false);
    this._open.set(false);
    this._paid.set(false);
    this.thankYouMessage.set(null);
  }
}

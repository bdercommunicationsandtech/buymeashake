import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentIntentResult, ShakeCheckoutPayload, SupporterItemDto } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/checkout`;

  createShakeIntent(payload: ShakeCheckoutPayload): Observable<PaymentIntentResult> {
    return this.http.post<PaymentIntentResult>(`${this.apiUrl}/create-intent`, payload);
  }

  createStripeCheckoutSession(payload: ShakeCheckoutPayload): Observable<{
    checkout_url: string;
    session_id: string;
    transaction_uuid: string;
  }> {
    return this.http.post<{ checkout_url: string; session_id: string; transaction_uuid: string }>(
      `${this.apiUrl}/stripe-session`,
      payload
    );
  }

  getStripeConnectLink(countryCode: string = 'MX'): Observable<{ account_link_url: string; stripe_connect_account_id: string }> {
    return this.http.post<{ account_link_url: string; stripe_connect_account_id: string }>(
      `${environment.apiUrl}/dashboard/payouts/connect-link?country_code=${encodeURIComponent(countryCode)}`,
      {}
    );
  }

  getStripeConnectStatus(): Observable<{
    stripe_connect_account_id: string | null;
    payouts_enabled: boolean;
    details_submitted: boolean;
    charges_enabled: boolean;
    requirements_due: string[];
  }> {
    return this.http.get<any>(`${environment.apiUrl}/dashboard/payouts/status`);
  }

  donateDirectShake(payload: ShakeCheckoutPayload): Observable<{
    success: boolean;
    message: string;
    transaction_uuid: string;
    gross_amount: number;
    new_goal_raised: number | null;
    thank_you_message?: string | null;
    supporter_item: SupporterItemDto;
  }> {
    return this.http.post<any>(`${this.apiUrl}/direct-shake`, payload);
  }

  createSubscriptionCheckoutSession(payload: {
    tier_id: number;
    supporter_email?: string;
    supporter_name?: string;
  }): Observable<{ checkout_url: string; session_id: string; transaction_uuid: string }> {
    return this.http.post<{ checkout_url: string; session_id: string; transaction_uuid: string }>(
      `${this.apiUrl}/subscription-session`,
      payload
    );
  }

  createCustomerPortalSession(): Observable<{ portal_url: string }> {
    return this.http.post<{ portal_url: string }>(`${this.apiUrl}/billing-portal`, {});
  }

  verifySession(
    sessionId: string,
    txUuid: string = '',
  ): Observable<{
    success?: boolean;
    handled?: boolean;
    new_goal_raised?: number | null;
    thank_you_message?: string | null;
    supporter_item?: SupporterItemDto | null;
    [key: string]: unknown;
  }> {
    const params: Record<string, string> = {};
    if (sessionId) params['session_id'] = sessionId;
    if (txUuid) params['tx'] = txUuid;
    return this.http.post<{
      success?: boolean;
      handled?: boolean;
      new_goal_raised?: number | null;
      thank_you_message?: string | null;
      supporter_item?: SupporterItemDto | null;
      [key: string]: unknown;
    }>(`${this.apiUrl}/verify-session`, {}, { params });
  }

  // ============================================================================
  // RETIROS (WITHDRAWALS - BDER STYLE)
  // ============================================================================

  getAthleteBalance(): Observable<{
    total_earned: number;
    total_withdrawn: number;
    available_balance: number;
    pending_withdrawal_amount: number;
    currency: string;
    destination_country: string;
    payouts_enabled: boolean;
    details_submitted: boolean;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/athlete/withdrawals/balance`);
  }

  requestWithdrawal(amountUsd: number, destinationCountry: string = 'MX'): Observable<{
    id: number;
    amount_usd: number;
    currency: string;
    destination_country: string;
    status: string;
    requested_at: string;
  }> {
    return this.http.post<any>(`${environment.apiUrl}/athlete/withdrawals/request`, {
      amount_usd: amountUsd,
      destination_country: destinationCountry,
    });
  }

  getWithdrawalHistory(): Observable<Array<{
    id: number;
    amount_usd: number;
    currency: string;
    destination_country: string;
    status: string;
    stripe_transfer_id?: string;
    failure_reason?: string;
    requested_at: string;
    processed_at?: string;
  }>> {
    return this.http.get<any[]>(`${environment.apiUrl}/athlete/withdrawals/history`);
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentIntentResult, ShakeCheckoutPayload } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/checkout`;

  createShakeIntent(payload: ShakeCheckoutPayload): Observable<PaymentIntentResult> {
    return this.http.post<PaymentIntentResult>(`${this.apiUrl}/create-intent`, payload);
  }

  donateDirectShake(payload: {
    athlete_handle: string;
    shakes_count: number;
    currency?: string;
    supporter_name?: string;
    supporter_message?: string;
    is_anonymous?: boolean;
  }): Observable<{
    success: boolean;
    message: string;
    transaction_uuid: string;
    gross_amount: number;
    new_goal_raised: number | null;
    thank_you_message?: string | null;
    supporter_item: {
      id: number;
      supporter_name: string;
      shakes_count: number;
      gross_amount: number;
      currency: string;
      supporter_message: string | null;
      is_anonymous: boolean;
      created_at: string;
    };
  }> {
    return this.http.post<any>(`${this.apiUrl}/direct-shake`, payload);
  }
}

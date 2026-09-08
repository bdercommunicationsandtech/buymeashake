import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import { PlatformStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.admin.stats}`;

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(this.url);
  }
}

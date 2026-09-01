import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LookupGroupDto, LookupItemDto } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  private readonly http = inject(HttpClient);

  getSportDisciplines(): Observable<LookupItemDto[]> {
    return this.http
      .get<LookupGroupDto[]>(`${environment.apiUrl}/system/lookups`)
      .pipe(
        map((groups) => groups.find((g) => g.code === 100)?.items ?? []),
      );
  }
}

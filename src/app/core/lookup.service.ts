import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DisciplineDto, LookupGroupDto, LookupItemDto } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  private readonly http = inject(HttpClient);

  /** Active disciplines from the canonical catalog (id is the stable key). */
  getSportDisciplines(): Observable<LookupItemDto[]> {
    return this.getDisciplines().pipe(
      map((items) =>
        items.map((d) => ({
          id: d.id,
          label: d.name,
          icon: null,
          sort_order: d.sort_order,
          metadata: null,
        })),
      ),
    );
  }

  getDisciplines(homeOnly = false): Observable<DisciplineDto[]> {
    const params = homeOnly ? '?home=1' : '';
    return this.http.get<DisciplineDto[]>(`${environment.apiUrl}/disciplines${params}`);
  }

  getAllLookups(): Observable<LookupGroupDto[]> {
    return this.http.get<LookupGroupDto[]>(`${environment.apiUrl}/system/lookups`);
  }
}

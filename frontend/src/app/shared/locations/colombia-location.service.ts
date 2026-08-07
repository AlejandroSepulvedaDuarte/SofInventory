import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ColombiaCatalog } from './location-form';


@Injectable({ providedIn: 'root' })
export class ColombiaLocationService {
  private catalogRequest?: Observable<ColombiaCatalog>;

  constructor(private http: HttpClient) {}

  load(force = false): Observable<ColombiaCatalog> {
    if (force) this.catalogRequest = undefined;
    if (!this.catalogRequest) {
      this.catalogRequest = this.http
        .get<ColombiaCatalog>(`${environment.apiUrl}/catalogos/ubicaciones/colombia/`)
        .pipe(
          catchError((error) => {
            this.catalogRequest = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.catalogRequest;
  }
}

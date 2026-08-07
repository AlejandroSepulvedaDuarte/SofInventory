import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Empresa, EmpresaResponse } from '../models';


@Injectable({ providedIn: 'root' })
export class EmpresaService {
  readonly empresa = signal<Empresa | null>(null);
  readonly configurada = signal(false);
  readonly puedeEditar = signal(false);

  constructor(private http: HttpClient) {}

  cargar(): Observable<EmpresaResponse> {
    return this.http.get<EmpresaResponse>(`${environment.apiUrl}/empresa/`).pipe(
      tap((response) => this.actualizarEstado(response)),
    );
  }

  guardar(data: FormData, existe: boolean): Observable<{ mensaje: string; empresa: Empresa }> {
    const request = existe
      ? this.http.put<{ mensaje: string; empresa: Empresa }>(`${environment.apiUrl}/empresa/`, data)
      : this.http.post<{ mensaje: string; empresa: Empresa }>(`${environment.apiUrl}/empresa/`, data);
    return request.pipe(tap((response) => {
      this.empresa.set(response.empresa);
      this.configurada.set(true);
    }));
  }

  private actualizarEstado(response: EmpresaResponse): void {
    this.empresa.set(response.empresa);
    this.configurada.set(response.configurada);
    this.puedeEditar.set(response.puede_editar);
  }
}

/*
 * Servicio de autenticación en memoria.
 * Administra login, logout, token y usuario actual.
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioPublico } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  // Signals privados para manejar el estado en memoria
  private _token = signal<string | null>(null);
  private _expiresAt = signal<Date | null>(null);

  // Signals públicos reactivos
  readonly currentUser = signal<UsuarioPublico | null>(null);
  readonly isLoggedIn = signal<boolean>(false);

  // Estado de autenticación reactivo (computed)
  readonly isAuthenticated = computed(() => {
    return !!this._token() && this.isLoggedIn() && !this.isExpired;
  });

  constructor(private http: HttpClient, private router: Router) {}

  // Getters
  get token(): string | null {
    return this._token();
  }

  get isExpired(): boolean {
    const expiry = this._expiresAt();
    if (!expiry) return true;
    return new Date() >= expiry;
  }

  // Acciones de autenticación
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API}/auth/login/`, credentials)
      .pipe(
        tap((res) => {
          this._token.set(res.access_token);
          this._expiresAt.set(new Date(res.expires_at));
          this.currentUser.set(res.usuario);
          this.isLoggedIn.set(true);
        })
      );
  }

  logout(): void {
    if (this._token()) {
      this.http.post(`${this.API}/auth/logout/`, {}).subscribe({ error: () => {} });
    }
    this._clearSession();
    this.router.navigate(['/login']);
  }

  me(): Observable<{ usuario: UsuarioPublico }> {
    return this.http
      .get<{ usuario: UsuarioPublico }>(`${this.API}/auth/me/`)
      .pipe(tap((res) => this.currentUser.set(res.usuario)));
  }

  // Helpers
  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user ? user.rol === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole('Administrador');
  }

  private _clearSession(): void {
    this._token.set(null);
    this._expiresAt.set(null);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }
}

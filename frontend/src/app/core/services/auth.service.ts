import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioPublico } from '../models';

const LS_TOKEN = 'auth_token';
const LS_EXPIRES = 'auth_expires_at';
const LS_USER = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  private _token = signal<string | null>(null);
  private _expiresAt = signal<Date | null>(null);
  readonly currentUser = signal<UsuarioPublico | null>(null);
  readonly isLoggedIn = signal<boolean>(false);

  readonly isAuthenticated = computed(() => {
    return !!this._token() && this.isLoggedIn() && !this.isExpired;
  });

  constructor(private http: HttpClient, private router: Router) {
    this._restoreSession();
  }

  get token(): string | null {
    return this._token();
  }

  get isExpired(): boolean {
    const expiry = this._expiresAt();
    if (!expiry) return true;
    return new Date() >= expiry;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API}/auth/login/`, credentials)
      .pipe(
        tap((res) => {
          this._saveSession(res.access_token, res.expires_at, res.usuario);
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
      .pipe(tap((res) => {
        this.currentUser.set(res.usuario);
        localStorage.setItem(LS_USER, JSON.stringify(res.usuario));
      }));
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user ? user.rol === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole('Administrador');
  }

  private _saveSession(token: string, expiresAt: string, usuario: UsuarioPublico): void {
    this._token.set(token);
    this._expiresAt.set(new Date(expiresAt));
    this.currentUser.set(usuario);
    this.isLoggedIn.set(true);
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_EXPIRES, expiresAt);
    localStorage.setItem(LS_USER, JSON.stringify(usuario));
  }

  private _restoreSession(): void {
    const token = localStorage.getItem(LS_TOKEN);
    const expiresAt = localStorage.getItem(LS_EXPIRES);
    const userJson = localStorage.getItem(LS_USER);
    if (!token || !expiresAt) return;
    const expiry = new Date(expiresAt);
    if (new Date() >= expiry) {
      this._clearSession();
      return;
    }
    this._token.set(token);
    this._expiresAt.set(expiry);
    if (userJson) {
      try {
        this.currentUser.set(JSON.parse(userJson));
      } catch { }
    }
    this.isLoggedIn.set(true);
  }

  private _clearSession(): void {
    this._token.set(null);
    this._expiresAt.set(null);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRES);
    localStorage.removeItem(LS_USER);
  }
}

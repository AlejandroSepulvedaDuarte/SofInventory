/*
 * Interceptor HTTP de autenticación.
 * Agrega el token en memoria a cada petición y redirige al login si el backend responde 401.
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const token = auth.token;

  // Si hay token, clonamos la petición con el header
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 en /auth/login/ y /auth/logout/ no debe disparar la limpieza:
      // el login lo muestra la vista y logout() ya limpia la sesión localmente.
      if (err.status === 401 && !isAuthUrl(req.url)) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    })
  );
};

function isAuthUrl(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/logout');
}

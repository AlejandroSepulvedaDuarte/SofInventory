/**
 * @file app.config.ts
 * @description
 * Configuración principal de la aplicación Angular.
 * Define los providers globales: router, HTTP client con interceptores y animaciones.
 */

import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),                                      // Configuración de rutas
    provideHttpClient(withInterceptors([authInterceptor])),    // HTTP con interceptor de autenticación
    provideAnimations(),                                        // Soporte para animaciones Angular
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};


 /**
 * @component InventarioComponent
 * @description
 * Componente de inicio de sesión.
 * Gestiona la autenticación del usuario contra el backend y mantiene
 * el estado visual del formulario (loading, errores y visibilidad de contraseña).
 *
 * Flujo general:
 * 1. El usuario ingresa credenciales.
 * 2. onLogin() llama al AuthService.
 * 3. Si el login es exitoso:
 *    - se almacena la sesión/token desde el servicio,
 *    - y se navega al dashboard principal.
 * 4. Si falla:
 *    - se muestra el mensaje de error en pantalla.
 */
import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeKey } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',

  // Componente standalone:
  // no necesita declararse dentro de un NgModule tradicional.
  standalone: true,

  // Módulos usados directamente en el template HTML.
  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})

export class LoginComponent {

  /* ──────────────────────────────────────────────────────────────────────
   * Modelo reactivo simple del formulario
   * ngModel mantiene sincronizados estos valores con el HTML.
   * ─────────────────────────────────────────────────────────────────── */
  username = '';
  password = '';

  /* ──────────────────────────────────────────────────────────────────────
   * Signals de estado visual
   * Angular Signals permite actualizar la UI de forma reactiva.
   * ─────────────────────────────────────────────────────────────────── */

  // Estado de carga mientras el backend valida credenciales
  loading = signal(false);

  // Mensaje de error visible en pantalla
  error = signal('');

  // Intentos fallidos restantes (para mostrar al usuario)
  intentosRestantes = signal<number | null>(null);

  // Indica si la cuenta está bloqueada
  cuentaBloqueada = signal(false);

  // Controla si la contraseña se muestra o se oculta
  showPass = signal(false);

  // Tema de pantalla seleccionado
  themeMenuOpen = signal(false);
  themeOptions = this.themeService.options;
  currentTheme = this.themeService.current;

  constructor(
    private auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  /* ──────────────────────────────────────────────────────────────────────
   * Alterna la visibilidad del input password.
   * true  -> type="text"
   * false -> type="password"
   * ─────────────────────────────────────────────────────────────────── */
  togglePass(): void {
    this.showPass.set(!this.showPass());
  }

  toggleThemeMenu(): void {
    this.themeMenuOpen.update((v) => !v);
  }

  closeThemeMenu(): void {
    this.themeMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.themeMenuOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.theme-switcher')) {
      this.closeThemeMenu();
    }
  }

  setTheme(theme: ThemeKey): void {
    this.themeService.apply(theme);
    this.closeThemeMenu();
  }

  /* ──────────────────────────────────────────────────────────────────────
   * Proceso principal de autenticación.
   * Validaciones: evita enviar campos vacíos.
   * finalize(): garantiza que loading vuelva a false incluso si la petición falla.
   * ─────────────────────────────────────────────────────────────────── */

  onLogin(): void {

    // Previene peticiones vacías
    if (!this.username || !this.password) return;

    // Activa estado visual de carga
    this.loading.set(true);

    // Limpia errores previos
    this.error.set('');
    this.intentosRestantes.set(null);
    this.cuentaBloqueada.set(false);

    this.auth.login({
      username: this.username,
      password: this.password
    })

    .pipe(
      // Se ejecuta SIEMPRE:
      // éxito, error o cancelación.
      finalize(() => this.loading.set(false))
    )

    .subscribe({
      // Login exitoso
      next: () => {
        console.log('Login exitoso, navegando...');
        // Redirección al dashboard principal
        this.router.navigate(['/dashboard']);

      },

      // Error de autenticación o conexión
      error: (err) => {
        console.error('Error detectado:', err);

        // Límite de intentos por IP (throttling del backend)
        if (err.status === 429) {
          this.error.set('Demasiados intentos de inicio de sesión. Espera un momento e inténtalo de nuevo.');
          return;
        }

        // Extraer información de la respuesta del backend
        const errorResponse = err.error || {};
        const mensajeError = errorResponse.error ?? 'Credenciales incorrectas. Intenta de nuevo.';
        
        // Mostrar mensaje de error
        this.error.set(mensajeError);
        
        // Si la cuenta está bloqueada
        if (errorResponse.cuenta_bloqueada) {
          this.cuentaBloqueada.set(true);
        } else if (errorResponse.intentos_restantes !== undefined) {
          // Mostrar intentos restantes si están disponibles
          this.intentosRestantes.set(errorResponse.intentos_restantes);
        }
      },

    });

  }

}
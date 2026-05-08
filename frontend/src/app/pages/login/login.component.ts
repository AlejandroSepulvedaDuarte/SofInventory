
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
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

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

  // Controla si la contraseña se muestra o se oculta
  showPass = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  /* ──────────────────────────────────────────────────────────────────────
   * Alterna la visibilidad del input password.
   * true  -> type="text"
   * false -> type="password"
   * ─────────────────────────────────────────────────────────────────── */
  togglePass(): void {
    this.showPass.set(!this.showPass());
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
        // Usa mensaje del backend si existe; de lo contrario muestra mensaje genérico.
        this.error.set(
          err.error?.error ??
          'Credenciales incorrectas. Intenta de nuevo.'
        );

      },

    });

  }

}
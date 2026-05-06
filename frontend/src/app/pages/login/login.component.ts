import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  togglePass(): void { this.showPass.set(!this.showPass()); }

  onLogin(): void {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.error.set('');

    // Usamos .pipe(finalize(...)) para asegurar que el loading se apague SIEMPRE
    this.auth.login({ username: this.username, password: this.password })
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          console.log('Login exitoso, navegando...');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Error detectado:', err);
          this.error.set(err.error?.error ?? 'Credenciales incorrectas. Intenta de nuevo.');
        },
      });
  }
}
/*
 * Pantalla de inicio de sesión.
 * Captura credenciales y activa la sesión en memoria usada por el resto del frontend.
 */

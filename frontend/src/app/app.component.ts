/*
 * Archivo raíz de la aplicación.
 * Su responsabilidad es montar el árbol principal de Angular y delegar
 * la navegación real a las rutas configuradas en app.routes.ts.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainerComponent } from './shared/notifications/notification-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationContainerComponent],
  template: `<router-outlet /><app-notification-container />`,
})
export class AppComponent {}


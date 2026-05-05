import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
/*
 * Archivo raíz de la aplicación.
 * Su responsabilidad es montar el árbol principal de Angular y delegar
 * la navegación real a las rutas configuradas en app.routes.ts.
 */

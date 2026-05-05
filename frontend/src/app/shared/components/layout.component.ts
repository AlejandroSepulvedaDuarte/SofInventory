import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <app-sidebar
        [mobileOpenState]="mobileOpen()"
        [class.mobile-open]="mobileOpen()"
        (collapsedChange)="sidebarCollapsed.set($event)"
        (mobileOpenChange)="mobileOpen.set($event)"
      />
      <div class="layout-right">
        <app-header (mobileMenuToggle)="toggleMobile()" />
        <main class="main-content">
          <ng-content />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
    .layout { display: flex; height: 100vh; overflow: hidden; }
    .layout-right { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow: hidden; }
    .main-content { flex: 1; overflow-y: auto; background: var(--bg-page); }
    @media (max-width: 768px) { .main-content { overflow-x: hidden; } }
  `],
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }
}
/*
 * Componente contenedor del layout principal.
 * Ensambla sidebar, header y el contenido proyectado de cada página del sistema.
 */

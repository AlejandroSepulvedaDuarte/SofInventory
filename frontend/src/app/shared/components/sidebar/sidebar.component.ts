import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnChanges {
  collapsed = signal(false);
  mobileOpen = signal(false);

  @Input() mobileOpenState = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() mobileOpenChange = new EventEmitter<boolean>();

  private readonly mainNav: NavItem[] = [
    {
      label: 'Dashboard',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
      route: '/dashboard',
    },
    {
      label: 'Productos',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
      route: '/productos',
    },
    {
      label: 'Categorías',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h8m-8 6h16"/></svg>`,
      route: '/categorias',
    },
    {
      label: 'Inventario',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      route: '/inventario',
    },
    {
      label: 'Proveedores',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8zM1 17h6m4 0h3"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>`,
      route: '/proveedores',
    },
    {
      label: 'Clientes',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      route: '/clientes',
    },
    {
      label: 'Compras',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
      route: '/compras',
    },
    {
      label: 'Ventas',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
      route: '/ventas',
    },
  ];

  private readonly adminNavItems: NavItem[] = [
    {
      label: 'Usuarios',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      route: '/usuarios',
    },
  ];

  visibleNav = computed(() => this.mainNav);
  adminNav = computed(() => (this.auth.isAdmin() ? this.adminNavItems : []));
  isAdmin = computed(() => this.auth.isAdmin());
  userInitial = computed(() => {
    const name = this.auth.currentUser()?.nombre ?? '?';
    return name.charAt(0).toUpperCase();
  });
  userName = computed(() => this.auth.currentUser()?.nombre ?? 'Usuario');
  userRole = computed(() => this.auth.currentUser()?.rol ?? '');

  constructor(public auth: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mobileOpenState']) {
      this.mobileOpen.set(changes['mobileOpenState'].currentValue);
    }
  }

  toggleCollapse(): void {
    this.collapsed.update((value) => !value);
    this.collapsedChange.emit(this.collapsed());
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
    this.mobileOpenChange.emit(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
/*
 * Barra lateral compartida.
 * Organiza accesos por módulos y controla navegación principal, colapso y cierre de sesión.
 */

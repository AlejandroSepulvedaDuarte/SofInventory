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
      icon: 'fa-gauge-high',
      route: '/dashboard',
    },
    {
      label: 'Productos',
      icon: 'fa-box',
      route: '/productos',
    },
    {
      label: 'Categorías',
      icon: 'fa-tags',
      route: '/categorias',
    },
    {
      label: 'Inventario',
      icon: 'fa-warehouse',
      route: '/inventario',
    },
    {
      label: 'Proveedores',
      icon: 'fa-truck',
      route: '/proveedores',
    },
    {
      label: 'Clientes',
      icon: 'fa-users',
      route: '/clientes',
    },
    {
      label: 'Compras',
      icon: 'fa-cart-shopping',
      route: '/compras',
    },
    {
      label: 'Ventas',
      icon: 'fa-money-bill-trend-up',
      route: '/ventas',
    },
  ];

  private readonly adminNavItems: NavItem[] = [
    {
      label: 'Usuarios',
      icon: 'fa-shield-halved',
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

import { Component, computed, signal, OnInit, OnDestroy, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, ThemeKey } from '../../../core/services/theme.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/productos':   'Productos',
  '/categorias':  'Categorías',
  '/inventario':  'Inventario',
  '/proveedores': 'Proveedores',
  '/clientes':    'Clientes',
  '/compras':     'Compras',
  '/ventas':      'Ventas',
  '/usuarios':    'Usuarios',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() mobileMenuToggle = new EventEmitter<void>();

  private _pageTitle = signal('Dashboard');
  private _currentTime = signal('');
  private timerInterval?: ReturnType<typeof setInterval>;
  private routerSub?: Subscription;

  pageTitle = this._pageTitle.asReadonly();
  currentTime = this._currentTime.asReadonly();

  userInitial = computed(() => {
    const name = this.auth.currentUser()?.nombre ?? '?';
    return name.charAt(0).toUpperCase();
  });

  userName = computed(() => this.auth.currentUser()?.nombre ?? 'Usuario');
  userRole = computed(() => this.auth.currentUser()?.rol ?? '');

  themeMenuOpen = signal(false);
  themeOptions = this.themeService.options;
  currentTheme = this.themeService.current;

  themeIcon = computed(() => {
    const found = this.themeService.options.find((o) => o.key === this.currentTheme());
    return found?.icon ?? 'fa-moon';
  });

  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    // Set initial title
    this._pageTitle.set(PAGE_TITLES[this.router.url] ?? 'Dashboard');

    // Update on navigation
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const path = '/' + e.urlAfterRedirects.split('/')[1];
        this._pageTitle.set(PAGE_TITLES[path] ?? 'ERP Pro');
      });

    // Live clock
    this._updateTime();
    this.timerInterval = setInterval(() => this._updateTime(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    this.routerSub?.unsubscribe();
  }

  toggleMobile(): void {
    this.mobileMenuToggle.emit();
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

  logout(): void {
    this.auth.logout();
  }

  private _updateTime(): void {
    const now = new Date();
    this._currentTime.set(
      now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }
}
/*
 * Encabezado compartido del layout.
 * Presenta información contextual y acciones de navegación secundaria para la vista actual.
 */

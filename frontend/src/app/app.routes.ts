/**
 * @file app.routes.ts
 * @description
 * Mapa central de navegación del frontend.
 * Define las pantallas disponibles y los guards que protegen cada módulo.
 * - authGuard: requiere usuario autenticado
 * - guestGuard: solo para usuarios no autenticados (login)
 * - adminGuard: requiere rol de administrador
 */

import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Login: solo accesible para usuarios no autenticados
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  // Dashboard: página principal
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  // Módulos principales (requieren autenticación)
  {
    path: 'productos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/productos/productos.component').then((m) => m.ProductosComponent),
  },

  {
    path: 'categorias',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
  },

  {
    path: 'proveedores',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
  },

  {
    path: 'clientes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
  },

  {
    path: 'compras',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/compras/compras.component').then((m) => m.ComprasComponent),
  },

  {
    path: 'ventas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/ventas/ventas.component').then((m) => m.VentasComponent),
  },

  {
    path: 'inventario',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inventario/inventario.component').then((m) => m.InventarioComponent),
  },

  // Usuarios: solo administradores
  {
    path: 'usuarios',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
  },

  // Wildcard: redirige a dashboard por defecto
  { path: '**', redirectTo: 'dashboard' },
];
/*
 * Fachada de servicios HTTP del sistema.
 * Centraliza los endpoints consumidos por Angular y adapta payloads del frontend al backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  Usuario, Rol, TipoDocumento,
  Categoria, Producto,
  Proveedor,
  Cliente,
  Compra,
  DetalleVenta,
  Venta,
  Almacen,
  DashboardData
} from '../models';

const API = environment.apiUrl;

// ══════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${API}/usuarios/listar/`);
  }

  crear(data: Partial<Usuario>): Observable<any> {
    return this.http.post(`${API}/usuarios/crear/`, data);
  }

  editar(id: number, data: Partial<Usuario>): Observable<any> {
    return this.http.put(`${API}/usuarios/editar/${id}/`, data);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${API}/usuarios/eliminar/${id}/`);
  }

  cambiarEstado(id: number): Observable<any> {
    return this.http.patch(`${API}/usuarios/estado/${id}/`, {});
  }

  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${API}/roles/listar/`);
  }

  listarTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${API}/tipos-documento/listar/`);
  }
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ProductosService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${API}/productos/listar/`);
  }

  crear(data: FormData | Partial<Producto>): Observable<any> {
    return this.http.post(`${API}/productos/crear/`, data);
  }

  editar(id: number, data: FormData | Partial<Producto>): Observable<any> {
    return this.http.put(`${API}/productos/editar/${id}/`, data);
  }

  configurar(id: number, data: Partial<Producto>): Observable<any> {
    return this.http.patch(`${API}/productos/configurar/${id}/`, data);
  }

  
    // ✅ Método corregido
  cambiarEstado(id: number, estado: string): Observable<any> {
    console.log(`Enviando petición: cambiar estado del producto ${id} a ${estado}`);
    const body = { estado: estado };
    return this.http.patch(`${API}/productos/cambiar-estado/${id}/`, body);
  }
  // Categorías
  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${API}/categorias/listar/`);
  }

  crearCategoria(data: Partial<Categoria>): Observable<any> {
    return this.http.post(`${API}/categorias/crear/`, data);
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete(`${API}/categorias/eliminar/${id}/`);
  }
}

// ══════════════════════════════════════════════════════════
// PROVEEDORES
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${API}/proveedores/listar/`);
  }

  crear(data: Partial<Proveedor>): Observable<any> {
    return this.http.post(`${API}/proveedores/crear/`, data);
  }

  editar(id: number, data: Partial<Proveedor>): Observable<any> {
    return this.http.put(`${API}/proveedores/editar/${id}/`, data);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${API}/proveedores/eliminar/${id}/`);
  }

  cambiarEstado(id: number): Observable<any> {
    return this.http.patch(`${API}/proveedores/estado/${id}/`, {});
  }
}

// ══════════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ClientesService {
  constructor(private http: HttpClient) {}

  private toPayload(data: Partial<Cliente>): Record<string, any> {
    return {
      tipo_cliente: data.tipo_cliente,
      categoria: data.categoria,
      tipo_documento_id: data.tipo_documento ? Number(data.tipo_documento) : null,
      numero_documento: data.numero_documento,
      nombres: data.nombres ?? '',
      apellidos: data.apellidos ?? '',
      razon_social: data.razon_social ?? '',
      nombre_comercial: data.nombre_comercial ?? '',
      email: data.email ?? '',
      telefono: data.telefono ?? '',
      telefono2: data.telefono2 ?? '',
      direccion: data.direccion ?? '',
      ciudad: data.ciudad ?? '',
      departamento: data.departamento ?? '',
      pais: data.pais ?? 'Colombia',
      codigo_postal: data.codigo_postal ?? '',
      estado: data.estado ?? 'activo',
      notas: data.notas ?? '',
    };
  }

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${API}/clientes/listar/`);
  }

  crear(data: Partial<Cliente>): Observable<any> {
    return this.http.post(`${API}/clientes/crear/`, this.toPayload(data));
  }

  editar(id: number, data: Partial<Cliente>): Observable<any> {
    return this.http.put(`${API}/clientes/editar/${id}/`, this.toPayload(data));
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${API}/clientes/eliminar/${id}/`);
  }

  cambiarEstado(id: number, estado: Cliente['estado']): Observable<any> {
    return this.http.patch(`${API}/clientes/estado/${id}/`, { estado });
  }
}

// ══════════════════════════════════════════════════════════
// COMPRAS
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ComprasService {
  constructor(private http: HttpClient) {}

  private toPayload(data: Partial<Compra>): Record<string, any> {
    const detalles = (data.detalles ?? []).map((detalle) => ({
      producto_id: Number(detalle.producto),
      cantidad: Number(detalle.cantidad),
      costo_unitario: Number(detalle.costo_unitario),
      iva: Number(detalle.iva_porcentaje ?? 0),
    }));

    const subtotal = detalles.reduce(
      (acc, item) => acc + (item.cantidad * item.costo_unitario),
      0
    );
    const iva_total = detalles.reduce(
      (acc, item) => acc + ((item.cantidad * item.costo_unitario) * item.iva / 100),
      0
    );

    return {
      proveedor_id: data.proveedor ? Number(data.proveedor) : null,
      numero_factura: String(data.numero_factura ?? '').trim(),
      fecha_compra: data.fecha_compra,
      tipo_compra: data.tipo_compra,
      subtotal,
      iva_total,
      total: subtotal + iva_total,
      productos: detalles,
    };
  }

  listar(): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${API}/compras/listar/`);
  }

  registrar(data: Partial<Compra>): Observable<any> {
    return this.http.post(`${API}/compras/registrar/`, this.toPayload(data));
  }

  detalle(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${API}/compras/detalle/${id}/`);
  }

  anular(id: number): Observable<any> {
    return this.http.patch(`${API}/compras/anular/${id}/`, {});
  }
}

// ══════════════════════════════════════════════════════════
// VENTAS
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class VentasService {
  constructor(private http: HttpClient) {}

  private toPayload(
    data: Partial<Venta> & { almacen_id?: number | null; detalles?: DetalleVenta[] }
  ): Record<string, any> {
    const metodo = String(data.metodo_pago ?? '');
    const total = Number(data.total ?? 0);
    const recibido = data.efectivo_recibido != null ? Number(data.efectivo_recibido) : null;
    const cambio = recibido != null ? Math.max(0, recibido - total) : null;

    return {
      cliente_id: data.cliente ? Number(data.cliente) : null,
      almacen_id: data.almacen_id ? Number(data.almacen_id) : null,
      descuento: Number(data.descuento ?? 0),
      observaciones: data.observaciones ?? '',
      productos: (data.detalles ?? []).map((detalle) => ({
        producto_id: Number(detalle.producto),
        cantidad: Number(detalle.cantidad),
        precio_unitario: Number(detalle.precio_unitario),
      })),
      metodo_pago: {
        metodo,
        efectivoRecibido: metodo === 'efectivo' ? recibido : null,
        cambio: metodo === 'efectivo' ? cambio : null,
      },
    };
  }

  listar(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${API}/ventas/listar/`);
  }

  crear(
    data: Partial<Venta> & { almacen_id?: number | null; detalles?: DetalleVenta[] }
  ): Observable<any> {
    return this.http.post(`${API}/ventas/crear/`, this.toPayload(data));
  }

  detalle(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${API}/ventas/detalle/${id}/`);
  }

  anular(id: number, motivo: string): Observable<any> {
    return this.http.patch(`${API}/ventas/anular/${id}/`, { motivo });
  }
}

// ══════════════════════════════════════════════════════════
// INVENTARIO
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class InventarioService {
  constructor(private http: HttpClient) {}

  listarStock(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/inventario/stock/listar/`);
  }

  estadisticas(): Observable<any> {
    return this.http.get<any>(`${API}/inventario/stock/estadisticas/`);
  }

  alertas(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/inventario/stock/alertas/`);
  }

  movimientoRapido(data: any): Observable<any> {
    return this.http.post(`${API}/inventario/stock/movimiento/`, data);
  }

  listarAlmacenes(): Observable<Almacen[]> {
    return this.http.get<Almacen[]>(`${API}/inventario/almacenes/listar/`);
  }

  crearAlmacen(data: Partial<Almacen>): Observable<any> {
    return this.http.post(`${API}/inventario/almacenes/crear/`, data);
  }

  editarAlmacen(id: number, data: Partial<Almacen>): Observable<any> {
    return this.http.put(`${API}/inventario/almacenes/editar/${id}/`, data);
  }

  eliminarAlmacen(id: number): Observable<any> {
    return this.http.delete(`${API}/inventario/almacenes/eliminar/${id}/`);
  }

  stockPorAlmacen(): Observable<any> {
    return this.http.get<any>(`${API}/inventario/stock/por-almacen/`);
  }
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<any> {
    // Obtener el rol directamente del AuthService sin almacenamiento
    // El token se envía automáticamente por el interceptor
    return this.http.get(`${API}/dashboard/`);
  }
}


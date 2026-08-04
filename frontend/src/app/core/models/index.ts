/*
 * Contratos de datos del frontend.
 * Reúne las interfaces TypeScript que describen usuarios, productos, compras, ventas e inventario.
 */
// ==================== AUTH ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  mensaje: string;
  access_token: string;
  expires_at: string;
  usuario: UsuarioPublico;
}

export interface UsuarioPublico {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  estado: string;
  email: string;
}

// ==================== USUARIOS ====================
export interface Usuario {
  id?: number;
  tipo_documento: number | TipoDocumento;
  numero_documento: string;
  nombre_completo: string;
  email: string;
  username: string;
  password?: string;
  rol: number | Rol;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
  observaciones?: string;
  // Nuevo campo que indica si la cuenta está bloqueada por intentos fallidos
  cuenta_bloqueada?: boolean;
  // Fecha del bloqueo (si aplica)
  fecha_bloqueo?: string | null;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
}

// ==================== PRODUCTOS ====================
export interface Categoria {
  id?: number;
  nombre: string;
  tipo_control: 'GENERAL' | 'HERRAMIENTA' | 'ELECTRICO' | 'LIQUIDO' | 'TORNILLERIA';
  descripcion?: string;
  creado_por?: number;
}

export interface Producto {
  id?: number;
  sku: string;
  nombre: string;
  marca: string;
  referencia: string;
  unidad_medida: string;
  categoria: number | Categoria;
  precio_compra: number;
  precio_venta: number;
  iva_porcentaje: number;
  stock: number;
  stock_minimo: number;
  descripcion?: string;
  observaciones?: string;
  especificaciones?: any;
  estado: 'pendiente' | 'activo' | 'inactivo';
  imagen?: string;
  creado_por?: number;
}

// ==================== PROVEEDORES ====================
export interface Proveedor {
  id?: number;
  tipo_documento: number | TipoDocumento;
  numero_documento: string;
  razon_social: string;
  nombre_contacto: string;
  cargo_contacto?: string;
  email: string;
  telefono: string;
  direccion: string;
  pais: string;
  departamento: string;
  ciudad: string;
  tipo_proveedor: 'Bienes' | 'Servicios' | 'Mixto';
  estado: 'Activo' | 'Inactivo';
  observaciones?: string;
}

// ==================== CLIENTES ====================
export interface Cliente {
  id?: number;
  tipo_cliente: 'natural' | 'juridica';
  categoria: 'general' | 'minorista' | 'mayorista' | 'corporativo';
  tipo_documento: number | TipoDocumento;
  numero_documento: string;
  nombres?: string;
  apellidos?: string;
  razon_social?: string;
  nombre_comercial?: string;
  email?: string;
  telefono?: string;
  telefono2?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  codigo_postal?: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  notas?: string;
}

// ==================== COMPRAS ====================
export interface DetalleCompra {
  producto: number;
  cantidad: number;
  costo_unitario: number;
  iva_porcentaje: number;
  subtotal?: number;
  total?: number;
}

export interface Compra {
  id?: number;
  proveedor: number | Proveedor;
  numero_factura: string;
  fecha_compra: string;
  tipo_compra: 'Contado' | 'Credito';
  almacen?: number | Almacen | null;
  almacen_nombre?: string;
  subtotal?: number;
  iva_total?: number;
  total?: number;
  estado?: 'pendiente' | 'completada' | 'anulada';
  detalles: DetalleCompra[];
}

// ==================== VENTAS ====================
export interface DetalleVenta {
  producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  nombre_producto?: string;
  sku_producto?: string;
}

export interface Venta {
  id?: number;
  numero_venta?: string;
  cliente?: number | null;
  cliente_nombre?: string;
  vendedor_nombre?: string;
  almacen?: number | null;
  almacen_nombre?: string;
  subtotal?: number;
  descuento?: number;
  tipo_iva?: 'automatico' | 'manual';
  iva_porcentaje?: number;
  iva_monto?: number;
  total?: number;
  metodo_pago: string;
  efectivo_recibido?: number;
  cambio?: number;
  observaciones?: string;
  estado?: 'completada' | 'anulada';
  fecha_creacion?: string;
  detalles: DetalleVenta[];
}

// ==================== INVENTARIO ====================
export interface Almacen {
  id?: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  responsable?: string;
  telefono?: string;
  capacidad?: number;
  estado?: 'activo' | 'inactivo' | 'mantenimiento';
  notas?: string;
}

export interface StockItem {
  producto_id: number;
  sku: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  estado_stock?: 'pendiente' | 'agotado' | 'bajo' | 'medio' | 'alto';
  almacen_id?: number | null;
  almacen_nombre?: string;
}

export interface MovimientoInventarioRequest {
  producto_id: number | string;
  almacen_id: number | string;
  almacen_destino_id?: number | string | null;
  cantidad: number;
  tipo: 'entrada' | 'salida' | 'transferencia';
  observacion?: string;
}

// ==================== DASHBOARD ====================
export interface DashboardData {
  ventas_hoy?: number;
  ventas_mes?: number;
  total_productos?: number;
  productos_bajo_stock?: number;
  total_clientes?: number;
  total_proveedores?: number;
  [key: string]: any;
}


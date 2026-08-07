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
  imagen_url?: string | null;
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
  producto_nombre?: string;
  producto_marca?: string;
  producto_referencia?: string;
  producto_unidad?: string;
  nombre_producto?: string;
  sku_producto?: string;
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
  registrado_por_nombre?: string;
  proveedor_nombre?: string;
  proveedor_documento?: string;
  observaciones?: string;
  fecha_registro?: string;
  fecha_anulacion?: string | null;
  anulado_por_nombre?: string;
  motivo_anulacion?: string;
  empresa_snapshot?: Partial<Empresa>;
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
  iva_porcentaje?: number;
  iva_monto?: number;
  total?: number;
}

export interface Venta {
  id?: number;
  numero_venta?: string;
  cliente?: number | null;
  cliente_nombre?: string;
  vendedor_nombre?: string;
  cliente_documento?: string;
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
  fecha_anulacion?: string | null;
  anulado_por_nombre?: string;
  motivo_anulacion?: string;
  empresa_snapshot?: Partial<Empresa>;
  detalles: DetalleVenta[];
}

// ==================== EMPRESA ====================
export interface Empresa {
  id?: number;
  nombre_comercial: string;
  razon_social?: string;
  nit: string;
  digito_verificacion?: string;
  logo?: string | null;
  logo_url?: string | null;
  direccion: string;
  pais: string;
  departamento: string;
  ciudad: string;
  telefono: string;
  email?: string;
  sitio_web?: string;
  mensaje_comprobante?: string;
  moneda: 'COP';
  prefijo_ventas?: string;
  creado_por_nombre?: string;
  actualizado_por_nombre?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface EmpresaResponse {
  configurada: boolean;
  puede_editar: boolean;
  empresa: Empresa | null;
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
export type PeriodoDashboard = 'hoy' | 'semana' | 'mes' | 'anio' | 'total';
export type RangoGraficaDashboard = 'siete_dias' | 'mes' | 'anio';

export interface ComparacionDashboard {
  disponible: boolean;
  porcentaje: number | null;
  direccion: 'sube' | 'baja' | 'igual' | 'sin_datos' | 'acumulado';
  valor_anterior: number | null;
  texto: string;
}

export interface IndicadorPeriodo {
  valor: number;
  cantidad: number;
  cantidad_anterior?: number | null;
  comparacion: ComparacionDashboard;
  ingreso_neto_sin_iva?: number;
  costo_ventas?: number;
  operaciones_sin_costo?: number;
}

export interface SerieOperacionesDashboard {
  labels: string[];
  ventas: number[];
  compras: number[];
  cantidad_ventas: number[];
  cantidad_compras: number[];
}

export interface DashboardData {
  version: number;
  metricas: {
    total_productos: number;
    productos_en_stock: number;
    total_ventas: number;
    ventas_mes: number;
    ventas_dia: number;
    total_clientes: number;
    total_proveedores: number;
    stock_bajo: number;
    compras_mes: number;
    margen_mes: number;
  };
  periodos: {
    ventas: Record<PeriodoDashboard, IndicadorPeriodo>;
    compras: Record<PeriodoDashboard, IndicadorPeriodo>;
    margen: Record<Exclude<PeriodoDashboard, 'total'>, IndicadorPeriodo>;
  };
  graficas: {
    operaciones: Record<RangoGraficaDashboard, SerieOperacionesDashboard>;
  };
  ventas_por_mes: Array<{ mes: string; total: number; cantidad: number }>;
  metodos_pago: Array<{ metodo: string; total: number; cantidad: number }>;
  estado_stock: { agotados: number; stock_bajo: number; stock_normal: number };
  top_vendedores: Array<{ nombre: string; total: number; ventas: number }>;
  mejor_vendedor_mes: { nombre: string; total: number; ventas: number } | null;
  alertas_stock: Array<{
    id: number; nombre: string; sku: string; stock: number; stock_minimo: number;
  }>;
  ventas_recientes: Array<{
    id: number; numero_venta: string; cliente: string; vendedor: string;
    total: number; metodo_pago: string; fecha_creacion: string;
  }>;
  top_productos: Array<{
    nombre: string; sku: string; total_vendido: number; total_ingresos: number;
  }>;
  reglas_calculo: {
    zona_horaria: string;
    inicio_semana: string;
    ventas: string;
    compras: string;
    margen: string;
    excluidos: Record<string, string[]>;
  };
}


export type ScreenView = 
  | 'identificacion' 
  | 'acceso_personal'
  | 'catalogo' 
  | 'mi_turno' 
  | 'caja_pos' 
  | 'despacho' 
  | 'metricas'
  | 'inventario'
  | 'usuarios'
  | 'auditoria';

export type UserRole = 
  | 'Admin' 
  | 'Cajero' 
  | 'Despachador' 
  | 'Auditor' 
  | 'Cliente';

export interface UserAprendiz {
  documento: string;
  tipoDoc: string;
  nombre: string;
  ficha: string;
  programa: string;
  jornada: string;
  turnoAlmuerzo: string;
  saldoMonedero: number;
  subsidioActivo: boolean;
  verificado: boolean;
}

export interface AppUser {
  id: string;
  documento: string;
  tipoDoc: string;
  nombre: string;
  email: string;
  rol: UserRole;
  ficha?: string;
  programa?: string;
  jornada?: string;
  turnoAlmuerzo?: string;
  saldoMonedero: number;
  subsidioActivo: boolean;
  activo: boolean;
  ultimoAcceso?: string;
}

export interface ProductItem {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'comida_rapida' | 'bebidas_frias' | 'cafe_calientes' | 'combos_sena' | 'reposteria' | 'otros';
  categoriaLabel: string;
  subcategoria: string;
  precio: number;
  costo: number;
  stock: number;
  alertaStock: number; // custom low stock alert threshold
  imagen: string;
  calorias: number;
  tag: string;
  agotado?: boolean;
}

export interface CartItem {
  product: ProductItem;
  cantidad: number;
}

export type OrderStatus = 
  | 'pago_confirmado' 
  | 'en_preparacion' 
  | 'listo_recoger' 
  | 'entregado'
  | 'anulado';

export interface OrderDetailItem {
  nombre: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Order {
  id: string;
  numeroTurno: string;
  fecha: string;
  hora: string;
  timestamp?: number;
  cliente: {
    nombre: string;
    documento: string;
    ficha: string;
    programa: string;
  };
  items: OrderDetailItem[];
  metodoPago: 'Billetera Digital SENA' | 'Efectivo' | 'Nequi' | 'Datáfono';
  subtotal: number;
  descuento: number;
  total: number;
  estado: OrderStatus;
  faseActual: number; // 1 to 4
  tiempoEstimadoMin?: number;
  idVenta: string;
  mesaKiosko: string;
  codigoQR: string;
  codigoBarras: string;
}

export interface POSOrder {
  id: string;
  numeroTurno: string;
  clienteNombre: string;
  documento: string;
  ficha: string;
  programa: string;
  tipoUsuario?: 'Aprendiz' | 'Instructor' | 'Funcionario';
  tiempoEspera: string;
  metodoPago: 'Efectivo' | 'Nequi' | 'Datáfono' | 'Billetera Digital SENA';
  items: Array<{
    cantidad: number;
    nombre: string;
    precio: number;
    nota?: string;
  }>;
  total: number;
  estado: 'pendiente' | 'cobrado' | 'anulado';
  tiempoRelativo: string;
  fecha: string;
  timestamp: number;
}

export interface ServiceReview {
  id: string;
  pedidoTurno: string;
  clienteNombre: string;
  calificacion: number; // 1 - 5
  tags: string[];
  comentario: string;
  fecha: string;
  hora: string;
}

export interface BajaItem {
  id: string;
  productoId: string;
  productoNombre: string;
  categoria: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  motivo: string;
  semana: string; // e.g. "Semana 37 (Sep 2026)"
  fecha: string;
  hora: string;
  timestamp: number;
  responsable: string;
  observaciones?: string;
}

export interface AuditLog {
  id: string;
  fecha: string;
  hora: string;
  timestamp: number;
  usuario: string; // Staff member only
  email: string;
  rol: UserRole;
  modulo: 'Inventario' | 'Precios' | 'Bajas' | 'Caja POS' | 'Usuarios' | 'Despacho' | 'Sistema';
  accion: string;
  detalle: string;
  tipo: 'creacion' | 'edicion' | 'eliminacion' | 'baja' | 'ajuste' | 'seguridad';
  ip?: string;
}

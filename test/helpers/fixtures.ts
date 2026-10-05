/**
 * Fábricas de datos de prueba (fixtures).
 *
 * Todas las funciones devuelven objetos NUEVOS para evitar mutaciones compartidas
 * entre casos de prueba. Usan el shape exacto de `src/types.ts` y de los adaptadores
 * de `src/lib/supabase.ts`.
 */
import type {
  AppUser,
  AuditLog,
  BajaItem,
  Order,
  OrderStatus,
  POSOrder,
  ProductItem,
  ServiceReview,
  UserAprendiz,
} from '../../src/types';
import type { DbProducto, TicketDespacho } from '../../src/lib/supabase';

/** Learner/aprendiz del kiosko. */
export function makeAprendiz(overrides: Partial<UserAprendiz> = {}): UserAprendiz {
  return {
    documento: '1020304050',
    tipoDoc: 'C.C. Cédula',
    nombre: 'María Pérez',
    ficha: '2671234',
    programa: 'ADSO / Análisis y Desarrollo de Software',
    jornada: 'Jornada Diurna 06:00 - 13:00',
    turnoAlmuerzo: 'Bloque B – 12:15',
    saldoMonedero: 25000,
    subsidioActivo: true,
    verificado: true,
    ...overrides,
  };
}

/** Producto del catálogo (shape de la app). */
export function makeProduct(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 'prod-7',
    nombre: 'Empanada Artesanal',
    descripcion: 'Empanada de carne con ají suave.',
    categoria: 'comida_rapida',
    categoriaLabel: 'Comida Rápida',
    subcategoria: 'General',
    precio: 5000,
    costo: 3000,
    stock: 10,
    alertaStock: 5,
    imagen: 'https://example.com/empanada.jpg',
    calorias: 250,
    tag: 'CGAO VÉLEZ',
    ...overrides,
  };
}

/** Fila cruda de la tabla `producto` (shape de Supabase). */
export function makeDbProducto(overrides: Partial<DbProducto> = {}): DbProducto {
  return {
    idproducto: 7,
    nombre: 'Empanada Artesanal',
    precio: 5000,
    stock: 10,
    imagen: 'https://example.com/empanada.jpg',
    stock_minimo: 5,
    costo: 3000,
    categoria: 'comida_rapida',
    subcategoria: 'General',
    descripcion: 'Empanada de prueba',
    es_especial: false,
    especial_hasta: null,
    activo: true,
    ...overrides,
  };
}

/** Fila cruda de la tabla `venta` con sus relaciones (shape de Supabase). */
export function makeDbVenta(overrides: Record<string, any> = {}) {
  return {
    idventa: 101,
    precio: 23000,
    estado: 'Pagado',
    metodo_pago: 'Efectivo',
    numero_pedido_diario: 42,
    referencia_pasarela: null,
    created_at: new Date().toISOString(),
    // En Supabase la relación `cliente:cliente(nombre, ficha)` reemplaza la FK numérica
    // por un objeto; la app lo lee así en `mapDbVentaToPOSOrder`.
    cliente: {
      nombre: 'María Pérez',
      ficha: 2671234,
    },
    detalleventa: [{ idproducto: 7, cantidad: 2, precio_unitario: 5000, producto: { nombre: 'Empanada Artesanal' } }],
    ...overrides,
  };
}

/** Orden activa del kiosco (shape de la app). */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-test-1',
    numeroTurno: '#001',
    fecha: '17/09/2026',
    hora: '10:30',
    timestamp: Date.now(),
    cliente: {
      nombre: 'María Pérez',
      documento: '1020304050',
      ficha: '2671234',
      programa: 'ADSO',
    },
    items: [
      { nombre: 'Empanada Artesanal', descripcion: '', cantidad: 2, precioUnitario: 5000, total: 10000 },
    ],
    metodoPago: 'Efectivo',
    subtotal: 10000,
    descuento: 0,
    total: 10000,
    estado: 'pendiente_pago',
    faseActual: 1,
    tiempoEstimadoMin: 4,
    idVenta: '#VTA-99',
    mesaKiosko: 'Kiosko A-01',
    ...overrides,
  };
}

/** Pedido del módulo Caja POS. */
export function makePosOrder(overrides: Partial<POSOrder> = {}): POSOrder {
  return {
    id: 'pos-101',
    idventaDb: 101,
    estadoDb: 'Pendiente de Pago',
    numeroTurno: '#042',
    clienteNombre: 'María Pérez',
    documento: '1020304050',
    ficha: '2671234',
    programa: 'Kiosco Digital CGAO',
    tipoUsuario: 'Aprendiz',
    tiempoEspera: 'Recién recibido',
    metodoPago: 'Efectivo',
    items: [{ cantidad: 2, nombre: 'Empanada Artesanal', precio: 5000 }],
    total: 23000,
    estado: 'pendiente',
    tiempoRelativo: 'Recién recibido',
    fecha: 'Hoy',
    timestamp: Date.now(),
    ...overrides,
  };
}

/** Ticket de la línea de despacho. */
export function makeTicket(overrides: Partial<TicketDespacho> = {}): TicketDespacho {
  return {
    id: 'k-101',
    idventaDb: 101,
    turno: '#042',
    clienteNombre: 'María Pérez',
    documento: '1020304050',
    ficha: '2671234',
    programa: 'Kiosco Digital CGAO',
    tipo: 'Rápida',
    tiempoMin: 2,
    fecha: 'Hoy',
    estado: 'entrante',
    items: [{ cantidad: 2, nombre: 'Empanada Artesanal' }],
    ...overrides,
  };
}

/** Baja / merma de inventario. */
export function makeBaja(overrides: Partial<BajaItem> = {}): BajaItem {
  return {
    id: 'baja-1',
    productoId: 'prod-7',
    productoNombre: 'Empanada Artesanal',
    categoria: 'Mermas Cocina',
    cantidad: 3,
    costoUnitario: 3000,
    costoTotal: 9000,
    motivo: 'Merma de cocción / preparación en cocina',
    semana: 'Semana 37 (8 - 14 Sep 2026)',
    fecha: new Date().toLocaleDateString('es-CO'),
    hora: '10:30',
    timestamp: Date.now(),
    responsable: 'Admin Cafetería',
    observaciones: 'Lote #L2609received',
    ...overrides,
  };
}

/** Registro de auditoría de personal. */
export function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'aud-1',
    fecha: '17/09/2026',
    hora: '10:30:00',
    timestamp: Date.now(),
    usuario: 'Laura Gómez',
    email: 'laura.gomez@sena.edu.co',
    rol: 'Admin',
    modulo: 'Inventario',
    accion: 'Alta de Nuevo Producto en Catálogo',
    detalle: 'Se dio de alta "Empanada Artesanal" con stock inicial de 10 u.',
    tipo: 'creacion',
    ip: '192.168.10.15 (Terminal Personal)',
    ...overrides,
  };
}

/** Usuario del directorio institucional. */
export function makeAppUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'admin-1098765432',
    documento: '1098765432',
    tipoDoc: 'C.C. Cédula',
    nombre: 'Administrador SENA CGAO',
    email: 'admin@sena.edu.co',
    rol: 'Admin',
    programa: 'Administración Cafetería CGAO',
    jornada: 'Jornada Completa',
    subsidioActivo: false,
    activo: true,
    ultimoAcceso: 'Pendiente',
    ...overrides,
  };
}

/** Reseña de satisfacción de un aprendiz. */
export function makeReview(overrides: Partial<ServiceReview> = {}): ServiceReview {
  return {
    id: 'rev-1',
    pedidoTurno: '#001',
    clienteNombre: 'María Pérez',
    calificacion: 5,
    tags: ['Atención rápida'],
    comentario: 'Excelente servicio',
    fecha: 'Hoy',
    hora: '10:30',
    ...overrides,
  };
}

/** Catalogo de prueba con 3 productos en categorías distintas. */
export function makeCatalog(): ProductItem[] {
  return [
    makeProduct({ id: 'prod-1', nombre: 'Empanada Artesanal', categoria: 'comida_rapida', categoriaLabel: 'Comida Rápida', precio: 5000, stock: 10, alertaStock: 5 }),
    makeProduct({ id: 'prod-2', nombre: 'Jugo de Naranja', categoria: 'bebidas_frias', categoriaLabel: 'Bebidas Frías', precio: 4000, stock: 2, alertaStock: 5 }),
    makeProduct({ id: 'prod-3', nombre: 'Café Americano', categoria: 'cafe_calientes', categoriaLabel: 'Café & Calientes', precio: 2500, stock: 0, alertaStock: 5, agotado: true }),
  ];
}

/** Estados de pedido válidos (OrderStatus). */
export const ORDER_STATUSES: OrderStatus[] = [
  'pendiente_pago',
  'pago_confirmado',
  'en_preparacion',
  'listo_recoger',
  'entregado',
  'anulado',
];

/** Métodos de pago soportados por la app. */
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia'] as const;

/** Roles de la app. */
export const APP_ROLES = ['Admin', 'Cajero', 'Despachador', 'Auditor', 'Cliente'] as const;
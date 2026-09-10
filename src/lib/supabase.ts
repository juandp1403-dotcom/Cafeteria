import { ProductItem, BajaItem, AuditLog, AppUser, Order, POSOrder } from '../types';

// =============================================================================
// ACCESO A DATOS 100% A TRAVÉS DEL SERVIDOR (server.ts)
// =============================================================================
// El navegador ya NO usa un cliente Supabase directo: todas las lecturas y
// escrituras pasan por el API Express, que internamente usa la SERVICE ROLE
// KEY (privada, solo servidor). Aquí solo quedan los tipos del esquema, los
// adaptadores puros (mapping fila SQL <-> tipo de la app) y checkSupabaseHealth.

// Helper: GET/POST/DELETE/PATCH al API del servidor (null si falla la petición).
async function apiJson<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[API] Error al llamar ${path}:`, err);
    return null;
  }
}

// =============================================================================
// DATABASE SCHEMA TYPES (Based on 05_ESQUEMA_SUPABASE_COMPLETO.sql)
// =============================================================================

export interface DbProducto {
  idproducto: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string | null;
  stock_minimo: number;
  costo: number;
  categoria: string | null;
  subcategoria: string | null;
  descripcion: string | null;
  es_especial: boolean;
  especial_hasta: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbCliente {
  documento: number;
  nombre: string;
  ficha: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbPersonal {
  docpersonal: number;
  nombre: string | null;
  clave?: string | null;
  email: string | null;
  rol: 'cajero' | 'despachador' | 'auditor';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbAdmin {
  documento: number;
  nombre: string;
  clave?: string;
  email: string;
  rol: 'admin' | 'superadmin';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbVenta {
  idventa?: number;
  precio: number;
  cliente: number;
  fechaventa?: string;
  estado: 'Pendiente de Pago' | 'Pagado' | 'En Preparacion' | 'Listo para Entrega' | 'Entregado' | 'Cancelado';
  metodo_pago: 'Efectivo' | 'Nequi' | 'Bancolombia' | 'Saldo';
  numero_pedido_diario?: number;
  referencia_pasarela?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbDetalleVenta {
  iddetalle?: number;
  idventa: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbBajaInventario {
  idbaja?: number;
  idproducto: number;
  cantidad: number;
  motivo: string;
  categoria: string;
  fecha?: string;
  usuario_documento?: number;
  usuario_tipo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbRegistroAuditoria {
  idregistro?: number;
  usuario: string;
  accion: string;
  entidad: string | null;
  detalle: string | null;
  timestamp?: string;
}

// =============================================================================
// HEALTH CHECK & CONNECTION DIAGNOSTICS (vía /api/supabase/status)
// =============================================================================

export interface SupabaseHealth {
  connected: boolean;
  url: string;
  latencyMs: number;
  productCount: number;
  error?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const start = performance.now();
  try {
    const resp = await fetch('/api/supabase/status');
    if (resp.ok) {
      const json = await resp.json();
      return {
        connected: json.connected === true,
        url: json.url || 'Supabase',
        latencyMs: json.latencyMs || Math.round(performance.now() - start),
        productCount: json.totalProductos || 0,
        error: json.error,
      };
    }
    return {
      connected: false,
      url: '',
      latencyMs: 0,
      productCount: 0,
      error: `HTTP ${resp.status} desde el servidor`,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: '',
      latencyMs: Math.round(performance.now() - start),
      productCount: 0,
      error: err?.message || 'Error de red con el servidor API',
    };
  }
}

// =============================================================================
// PRODUCTOS ADAPTERS (PURE)
// =============================================================================

export function mapDbProductoToItem(db: DbProducto): ProductItem {
  const cat = (db.categoria || 'otros') as ProductItem['categoria'];
  const catLabels: Record<string, string> = {
    comida_rapida: 'Comida Rápida',
    bebidas_frias: 'Bebidas Frías',
    cafe_calientes: 'Café & Calientes',
    combos_sena: 'Combos SENA',
    reposteria: 'Repostería',
    otros: 'Otros Insumos',
  };

  return {
    id: `prod-${db.idproducto}`,
    nombre: db.nombre,
    descripcion: db.descripcion || '',
    precio: db.precio,
    costo: db.costo,
    stock: db.stock,
    alertaStock: db.stock_minimo,
    categoria: ['comida_rapida', 'bebidas_frias', 'cafe_calientes', 'combos_sena', 'reposteria', 'otros'].includes(cat) ? cat : 'otros',
    categoriaLabel: catLabels[cat] || 'General',
    subcategoria: db.subcategoria || 'General',
    imagen: db.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    calorias: 250,
    tag: db.es_especial ? 'ESPECIAL CHEF' : 'CGAO VÉLEZ',
    agotado: db.stock <= 0 || !db.activo,
  };
}

export function mapItemToDbProducto(item: ProductItem): Partial<DbProducto> {
  const numericId = parseInt(item.id.replace('prod-', ''), 10);
  return {
    ...(isNaN(numericId) ? {} : { idproducto: numericId }),
    nombre: item.nombre,
    precio: item.precio,
    costo: item.costo,
    stock: item.stock,
    stock_minimo: item.alertaStock,
    categoria: item.categoria,
    subcategoria: item.subcategoria,
    descripcion: item.descripcion,
    imagen: item.imagen,
    es_especial: item.tag.includes('ESPECIAL'),
    activo: !item.agotado,
  };
}

// =============================================================================
// PRODUCTOS (READ + WRITE)
// =============================================================================

export async function fetchProductsFromSupabase(): Promise<ProductItem[] | null> {
  const json = await apiJson<{ success: boolean; data: DbProducto[] }>('/api/supabase/productos');
  if (!json?.success || !Array.isArray(json.data) || json.data.length === 0) return null;
  return json.data.map(mapDbProductoToItem);
}

// Persiste un producto (upsert por idproducto) vía el servidor.
export async function saveProductToSupabase(item: ProductItem): Promise<boolean> {
  const json = await apiJson<{ success: boolean }>('/api/supabase/productos', {
    method: 'POST',
    body: JSON.stringify(mapItemToDbProducto(item)),
  });
  return json?.success === true;
}

// Elimina un producto de Supabase por su id o por el objeto completo.
export async function deleteProductFromSupabase(itemOrId: ProductItem | string): Promise<boolean> {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  const numericId = parseInt(id.replace('prod-', ''), 10);
  if (isNaN(numericId)) return false;
  const json = await apiJson<{ success: boolean }>(`/api/supabase/productos/${numericId}`, { method: 'DELETE' });
  return json?.success === true;
}

// =============================================================================
// BAJAS DE INVENTARIO ADAPTERS (READ + WRITE)
// =============================================================================

export async function fetchBajasFromSupabase(): Promise<BajaItem[] | null> {
  const json = await apiJson<{ success: boolean; data: any[] }>('/api/supabase/bajas');
  if (!json?.success || !Array.isArray(json.data)) return null;

  return json.data.map((b: any) => {
    const prodName = b.producto?.nombre || `Producto #${b.idproducto}`;
    const costoUni = b.producto?.costo || 1500;
    const bDate = b.fecha ? new Date(b.fecha) : new Date();
    return {
      id: `baja-${b.idbaja}`,
      productoId: `prod-${b.idproducto}`,
      productoNombre: prodName,
      categoria: b.categoria || 'Mermas Cocina',
      cantidad: b.cantidad,
      costoUnitario: costoUni,
      costoTotal: costoUni * b.cantidad,
      motivo: b.motivo,
      semana: 'Semana Actual',
      fecha: bDate.toLocaleDateString('es-CO'),
      hora: bDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: bDate.getTime(),
      responsable: b.usuario_tipo ? `${b.usuario_tipo} (${b.usuario_documento || 'SENA'})` : 'Admin Cafetería',
      observaciones: `Registro institucional archivado (ID #${b.idbaja}).`,
    };
  });
}

export function mapBajaToDbBajaInventario(baja: BajaItem): Partial<DbBajaInventario> {
  const numericId = parseInt(baja.productoId.replace('prod-', ''), 10);
  return {
    idproducto: isNaN(numericId) ? 0 : numericId,
    cantidad: baja.cantidad,
    motivo: baja.motivo,
    categoria: baja.categoria,
    fecha: new Date().toISOString(),
    usuario_documento: null,
    usuario_tipo: baja.responsable || 'Admin Cafetería',
  };
}

export async function saveBajaToSupabase(baja: BajaItem): Promise<boolean> {
  const json = await apiJson<{ success: boolean }>('/api/supabase/bajas', {
    method: 'POST',
    body: JSON.stringify(mapBajaToDbBajaInventario(baja)),
  });
  return json?.success === true;
}

// =============================================================================
// AUDITORÍA ADAPTERS (READ + WRITE)
// =============================================================================

export async function recordAuditToSupabase(log: AuditLog): Promise<boolean> {
  const dbRow: Partial<DbRegistroAuditoria> = {
    usuario: `${log.usuario} (${log.rol})`,
    accion: log.accion,
    entidad: log.modulo,
    detalle: log.detalle,
    timestamp: new Date(log.timestamp || Date.now()).toISOString(),
  };
  const json = await apiJson<{ success: boolean }>('/api/supabase/auditoria', {
    method: 'POST',
    body: JSON.stringify(dbRow),
  });
  return json?.success === true;
}

// =============================================================================
// VENTAS ADAPTERS (READ + WRITE)
// =============================================================================

function parseDocumentoNumero(doc: string): number {
  const digits = (doc || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Inserta una venta vía el servidor (garantiza cliente, cabecera y detalle).
export async function recordVentaToSupabase(order: Order): Promise<number | null> {
  const json = await apiJson<{ success: boolean; idventa?: number }>('/api/supabase/ventas', {
    method: 'POST',
    body: JSON.stringify({ order }),
  });
  return json?.success ? (json.idventa ?? null) : null;
}

// =============================================================================
// USUARIOS ADAPTERS (READ - admin y personal, SIN el campo clave)
// =============================================================================

export async function fetchUsersFromSupabase(): Promise<AppUser[] | null> {
  const json = await apiJson<{
    success: boolean;
    data: { admins: any[]; personal: any[] };
  }>('/api/supabase/usuarios');
  if (!json?.success || !json.data) return null;

  const users: AppUser[] = [];

  for (const a of json.data.admins || []) {
    users.push({
      id: `admin-${a.documento}`,
      documento: String(a.documento),
      tipoDoc: 'C.C. Cédula',
      nombre: a.nombre || 'Administrador CGAO',
      email: a.email || '',
      rol: 'Admin',
      programa: 'Administración Cafetería CGAO',
      jornada: 'Jornada Completa',
      saldoMonedero: 0,
      subsidioActivo: false,
      activo: a.activo !== false,
      ultimoAcceso: '',
    });
  }

  const rolMap: Record<string, AppUser['rol']> = {
    cajero: 'Cajero',
    despachador: 'Despachador',
    auditor: 'Auditor',
  };
  for (const p of json.data.personal || []) {
    users.push({
      id: `personal-${p.docpersonal}`,
      documento: String(p.docpersonal),
      tipoDoc: 'C.C. Cédula',
      nombre: p.nombre || 'Personal CGAO',
      email: p.email || '',
      rol: rolMap[p.rol] || 'Cajero',
      programa: 'Planta Cafetería CGAO',
      jornada: 'Jornada Diurna',
      saldoMonedero: 0,
      subsidioActivo: false,
      activo: p.activo !== false,
      ultimoAcceso: '',
    });
  }

  return users;
}

// =============================================================================
// CLIENTES ADAPTERS (READ + WRITE - kiosko de identificacion)
// =============================================================================

export async function fetchClienteFromSupabase(documento: string): Promise<{ nombre: string; ficha: number } | null> {
  const doc = parseDocumentoNumero(documento);
  if (!doc) return null;
  const json = await apiJson<{ success: boolean; data: { nombre: string; ficha: number } | null }>(
    `/api/supabase/clientes/${doc}`
  );
  if (!json?.success || !json.data) return null;
  return { nombre: json.data.nombre || '', ficha: json.data.ficha || 0 };
}

// Garantiza que el cliente exista en la tabla `cliente` (create-or-get).
export async function ensureClienteToSupabase(documento: string, nombre: string, ficha: string): Promise<boolean> {
  const doc = parseDocumentoNumero(documento);
  if (!doc || doc <= 0) return false;
  const json = await apiJson<{ success: boolean }>('/api/supabase/clientes', {
    method: 'POST',
    body: JSON.stringify({ documento: doc, nombre: nombre || 'Cliente CGAO', ficha: parseDocumentoNumero(ficha) || 0 }),
  });
  return json?.success === true;
}

// =============================================================================
// VENTAS ADAPTERS (READ + WRITE ESTADO)
// =============================================================================

function periodoDeFecha(ts: number, now: number = Date.now()): 'Hoy' | 'Esta Semana' | 'Este Mes' {
  const d = new Date(ts);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return 'Hoy';
  const monday = new Date(n);
  const day = (n.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(n.getDate() - day);
  if (d.getTime() >= monday.getTime()) return 'Esta Semana';
  return 'Este Mes';
}

export function mapDbVentaToPOSOrder(v: any, now?: number): POSOrder {
  const ts = v.created_at ? new Date(v.created_at).getTime() : v.fechaventa ? new Date(v.fechaventa).getTime() : Date.now();
  const nowMs = now || Date.now();

  const metodoMap: Record<string, POSOrder['metodoPago']> = {
    Efectivo: 'Efectivo',
    Nequi: 'Nequi',
    Bancolombia: 'Datáfono',
    Saldo: 'Billetera Digital SENA',
  };

  const estadoMap: Record<string, POSOrder['estado']> = {
    'Pendiente de Pago': 'pendiente',
    Pagado: 'cobrado',
    'En Preparacion': 'cobrado',
    'Listo para Entrega': 'cobrado',
    Entregado: 'cobrado',
    Cancelado: 'anulado',
  };

  const items = (v.detalleventa || []).map((det: any) => ({
    cantidad: det.cantidad,
    nombre: det.producto?.nombre || `Producto #${det.idproducto}`,
    precio: det.precio_unitario ?? 0,
  }));

  const minsDiff = Math.max(0, Math.round((nowMs - ts) / 60000));

  return {
    id: `pos-${v.idventa}`,
    idventaDb: v.idventa,
    estadoDb: v.estado as string,
    numeroTurno: v.numero_pedido_diario ? `#${v.numero_pedido_diario}` : `#VTA-${v.idventa}`,
    clienteNombre: v.cliente?.nombre || 'Aprendiz CGAO',
    documento: String(v.cliente || ''),
    ficha: v.cliente?.ficha ? String(v.cliente.ficha) : '',
    programa: 'Kiosco Digital CGAO',
    tipoUsuario: 'Aprendiz',
    tiempoEspera: minsDiff <= 0 ? 'Recién recibido' : `hace ${minsDiff} min`,
    metodoPago: metodoMap[v.metodo_pago] || 'Efectivo',
    items: items.length
      ? items
      : [{ cantidad: 1, nombre: 'Consumición CGAO', precio: v.precio }],
    total: v.precio,
    estado: estadoMap[v.estado] || 'pendiente',
    tiempoRelativo: minsDiff <= 0 ? 'Recién recibido' : `hace ${minsDiff} min`,
    fecha: periodoDeFecha(ts, nowMs),
    timestamp: ts,
  };
}

// Lee las últimas ventas (con cliente y detalle) a través del servidor.
export async function fetchVentasFromSupabase(): Promise<POSOrder[]> {
  const json = await apiJson<{ success: boolean; data: any[] }>('/api/supabase/ventas');
  if (!json?.success || !Array.isArray(json.data)) return [];
  return json.data.map((v: any) => mapDbVentaToPOSOrder(v));
}

// Actualiza el estado de una venta en Supabase (cobro / avance de despacho).
export async function updateVentaEstadoToSupabase(idventa: number, estado: DbVenta['estado']): Promise<boolean> {
  const json = await apiJson<{ success: boolean }>(`/api/supabase/ventas/${idventa}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
  return json?.success === true;
}

// =============================================================================
// DESPACHO ADAPTERS (READ - tickets de la línea de despacho)
// =============================================================================

export interface TicketDespacho {
  id: string;
  idventaDb: number;
  turno: string;
  clienteNombre: string;
  documento?: string;
  ficha?: string;
  programa?: string;
  tipo: 'Almuerzo' | 'Rápida' | 'Bebidas';
  tiempoMin: number;
  fecha: 'Hoy' | 'Esta Semana' | 'Este Mes';
  estado: 'entrante' | 'preparacion' | 'listo' | 'entregado';
  items: Array<{ cantidad: number; nombre: string; detalle?: string }>;
}

function tipoTicketDesdeItems(items: string[]): TicketDespacho['tipo'] {
  const joined = items.join(' ').toLowerCase();
  if (joined.includes('almuerzo') || joined.includes('ejecutivo')) return 'Almuerzo';
  if (
    joined.includes('jugo') ||
    joined.includes('caf') ||
    joined.includes('limonada') ||
    joined.includes('avena') ||
    joined.includes('bebida') ||
    joined.includes('mora') ||
    joined.includes('capuchino')
  ) {
    return 'Bebidas';
  }
  return 'Rápida';
}

export async function fetchTicketsDespachoFromSupabase(): Promise<TicketDespacho[]> {
  const json = await apiJson<{ success: boolean; data: any[] }>('/api/supabase/despacho');
  if (!json?.success || !Array.isArray(json.data)) return [];

  return json.data.map((v: any) => {
    const ts = v.created_at ? new Date(v.created_at).getTime() : v.fechaventa ? new Date(v.fechaventa).getTime() : Date.now();
    const nowMs = Date.now();
    const minsDiff = Math.max(0, Math.round((nowMs - ts) / 60000));

    const itemNombres = (v.detalleventa || []).map((det: any) => det.producto?.nombre || `Producto #${det.idproducto}`);
    const items = itemNombres.length
      ? itemNombres.map((nombre: string, idx: number) => {
          const det: any = (v.detalleventa || [])[idx];
          return { cantidad: det.cantidad, nombre, detalle: undefined as string | undefined };
        })
      : [{ cantidad: 1, nombre: 'Consumición CGAO', detalle: undefined as string | undefined }];

    const estadoMap: Record<string, TicketDespacho['estado']> = {
      Pagado: 'entrante',
      'En Preparacion': 'preparacion',
      'Listo para Entrega': 'listo',
      Entregado: 'entregado',
    };

    return {
      id: `k-${v.idventa}`,
      idventaDb: v.idventa,
      turno: v.numero_pedido_diario ? `#${v.numero_pedido_diario}` : `#VTA-${v.idventa}`,
      clienteNombre: v.cliente?.nombre || 'Aprendiz CGAO',
      documento: String(v.cliente || ''),
      ficha: v.cliente?.ficha ? String(v.cliente.ficha) : '',
      programa: 'Kiosco Digital CGAO',
      tipo: tipoTicketDesdeItems(itemNombres),
      tiempoMin: minsDiff,
      fecha: periodoDeFecha(ts, nowMs),
      estado: estadoMap[v.estado] || 'entrante',
      items,
    };
  });
}

// =============================================================================
// USUARIOS ADAPTERS (WRITE - usuarios y clientes desde Gestión de Usuarios)
// =============================================================================

export interface SaveUsuarioResult {
  ok: boolean;
  reason?: string;
}

export async function saveUsuarioToSupabase(user: AppUser): Promise<SaveUsuarioResult> {
  try {
    const doc = parseDocumentoNumero(user.documento);
    if (!doc) return { ok: false, reason: 'El documento ingresado no es válido.' };

    const res = await fetch('/api/supabase/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    const json = await res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor.' }));

    if (json.success) return { ok: true };
    return { ok: false, reason: json.error || 'No se pudo guardar el usuario en Supabase.' };
  } catch (err: any) {
    console.error('[Supabase] Error al guardar usuario:', err?.message || err);
    return { ok: false, reason: err?.message || 'Error de red al guardar usuario.' };
  }
}

// =============================================================================
// AUDITORÍA ADAPTERS (READ)
// =============================================================================

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[] | null> {
  const json = await apiJson<{ success: boolean; data: any[] }>('/api/supabase/auditoria');
  if (!json?.success || !Array.isArray(json.data) || json.data.length === 0) return null;

  return json.data.map((r: any) => {
    const ts = r.timestamp ? new Date(r.timestamp) : new Date();
    const rolMatch = /\(([^)]+)\)/.exec(r.usuario || '');
    return {
      id: `aud-${r.idregistro}`,
      fecha: ts.toLocaleDateString('es-CO'),
      hora: ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: ts.getTime(),
      usuario: (r.usuario || 'Personal CGAO').split(' (')[0],
      email: '',
      rol: (rolMatch ? rolMatch[1] : 'Admin') as AppUser['rol'],
      modulo: r.entidad || 'Sistema',
      accion: r.accion,
      detalle: r.detalle || '',
      tipo: 'edicion',
      ip: 'Registro Supabase',
    };
  });
}
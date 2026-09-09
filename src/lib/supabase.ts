import { createClient } from '@supabase/supabase-js';
import { ProductItem, BajaItem, AuditLog, AppUser, Order } from '../types';

// Supabase Configuration from Environment or provided Project credentials
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://avwoaoxbxgbgvgqgvizo.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_jyF6iE-KjmN5S0sPAlMVmg_hiZeb50Z';

// Fallback secret key for administrative client in local development/browser context
export const SUPABASE_SECRET_KEY = 
  import.meta.env.SUPABASE_SECRET_KEY || 
  'sb_secret_YHflb-cP7Acbfw7f1RMrKQ_pvZfVRyD';

// Single Supabase Client instance for the browser context
// Using a single instance avoids GoTrueClient duplicate session warnings
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Alias supabaseAdmin to supabase so no second GoTrueClient is ever spawned in the browser
export const supabaseAdmin = supabase;

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
// HEALTH CHECK & CONNECTION DIAGNOSTICS
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
    // 1. Try server backend API endpoint first
    try {
      const resp = await fetch('/api/supabase/status');
      if (resp.ok) {
        const json = await resp.json();
        if (json.connected) {
          return {
            connected: true,
            url: json.url || SUPABASE_URL,
            latencyMs: json.latencyMs || Math.round(performance.now() - start),
            productCount: json.totalProductos || 0,
          };
        }
      }
    } catch {
      // If /api endpoint is unreachable in standalone client mode, continue to direct client
    }

    // 2. Direct client fallback
    const { data, error } = await supabase
      .from('producto')
      .select('idproducto', { count: 'exact' });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        connected: false,
        url: SUPABASE_URL,
        latencyMs,
        productCount: 0,
        error: error.message,
      };
    }

    return {
      connected: true,
      url: SUPABASE_URL,
      latencyMs,
      productCount: data?.length || 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: SUPABASE_URL,
      latencyMs: Math.round(performance.now() - start),
      productCount: 0,
      error: err?.message || 'Error de red con Supabase',
    };
  }
}

// =============================================================================
// PRODUCTOS ADAPTERS
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

export async function fetchProductsFromSupabase(): Promise<ProductItem[] | null> {
  try {
    // 1. Try server backend API
    try {
      const resp = await fetch('/api/supabase/productos');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map(mapDbProductoToItem);
        }
      }
    } catch {
      // Backend not reached, proceed to direct client
    }

    // 2. Direct client fallback
    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .order('idproducto', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data.map(mapDbProductoToItem);
  } catch {
    return null;
  }
}

// =============================================================================
// DATABASE INTEGRITY: STRICT READ-ONLY MODE
// No inserts, updates, or deletions are executed against Supabase
// =============================================================================

export async function saveProductToSupabase(_item: ProductItem): Promise<boolean> {
  // Read-only mode: Supabase is never mutated
  return true;
}

export async function deleteProductFromSupabase(_itemOrId: ProductItem | string): Promise<boolean> {
  // Read-only mode: Supabase is never mutated
  return true;
}

// =============================================================================
// BAJAS DE INVENTARIO ADAPTERS (READ-ONLY)
// =============================================================================

export async function fetchBajasFromSupabase(): Promise<BajaItem[] | null> {
  try {
    let rawBajas: any[] | null = null;

    // 1. Try server backend API
    try {
      const resp = await fetch('/api/supabase/bajas');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.data)) {
          rawBajas = json.data;
        }
      }
    } catch {
      // Fallback
    }

    // 2. Direct client fallback if server didn't supply
    if (!rawBajas) {
      const { data, error } = await supabase
        .from('bajainventario')
        .select('*, producto:idproducto(nombre, costo, categoria)')
        .order('idbaja', { ascending: false });

      if (!error && data) {
        rawBajas = data;
      }
    }

    if (!rawBajas) return null;

    return rawBajas.map((b: any) => {
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
  } catch {
    return null;
  }
}

export async function saveBajaToSupabase(_baja: BajaItem): Promise<boolean> {
  // Read-only mode: Supabase is never mutated
  return true;
}

// =============================================================================
// AUDITORÍA ADAPTERS (READ-ONLY)
// =============================================================================

export async function recordAuditToSupabase(_log: AuditLog): Promise<boolean> {
  // Read-only mode: Supabase is never mutated
  return true;
}

// =============================================================================
// VENTAS ADAPTERS (READ-ONLY)
// =============================================================================

export async function recordVentaToSupabase(_order: Order): Promise<number | null> {
  // Read-only mode: Supabase is never mutated
  return null;
}


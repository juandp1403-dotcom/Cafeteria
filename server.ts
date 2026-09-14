import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import bcryptPkg from 'bcryptjs';
const bcrypt = (bcryptPkg as any).default || bcryptPkg;
import { scryptSync, pbkdf2Sync, timingSafeEqual } from 'crypto';

process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = parseInt(process.env.PORT || '3589', 10);

// Security Hardening
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Server-side Supabase client credentials come ONLY from process.env (no hardcoded fallbacks)
function isRealSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (
    trimmed.includes('tu-proyecto') ||
    trimmed.includes('your-project') ||
    trimmed.includes('example.com') ||
    !trimmed.startsWith('https://')
  ) {
    return false;
  }
  return true;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = isRealSupabaseUrl(SUPABASE_URL) && !!SUPABASE_SERVICE_ROLE_KEY;

if (!isConfigured) {
  console.log(
    '[Supabase] Esperando configuración de variables de entorno con credenciales reales de Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Base de datos lista.'
  );
}

const supabaseServer = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  : null;

// Security Headers Middleware (OWASP recommended)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Cafetería SENA CGAO Backend',
    supabase: !!supabaseServer,
    mode: supabaseServer ? 'supabase' : 'in-memory-mock',
  });
});

// =============================================================================
// IN-MEMORY MOCK STORE (Para desarrollo y ejecución sin credenciales Supabase)
// =============================================================================

interface MockProducto {
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

// Credenciales oficiales de administración institucional solicitadas
const DEFAULT_ADMIN_EMAIL = 'admin@sena.edu.co';
const DEFAULT_ADMIN_PASS = 'admin1234';
const DEFAULT_ADMIN_DOC = 1098765432;
const DEFAULT_ADMIN_NAME = 'Administrador SENA CGAO';

// Catálogo y pedidos vacíos por defecto (la app opera exclusivamente con Supabase)
let mockProductos: MockProducto[] = [];

interface MockAdmin {
  documento: number;
  nombre: string;
  email: string;
  clave: string;
  rol: 'admin' | 'superadmin';
  activo: boolean;
}

const mockAdmins: MockAdmin[] = [
  {
    documento: DEFAULT_ADMIN_DOC,
    nombre: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    clave: bcrypt.hashSync(DEFAULT_ADMIN_PASS, 10),
    rol: 'admin',
    activo: true,
  },
];

interface MockPersonal {
  docpersonal: number;
  nombre: string;
  email: string;
  clave: string;
  rol: 'cajero' | 'despachador' | 'auditor';
  activo: boolean;
}

const mockPersonal: MockPersonal[] = [];

interface MockCliente {
  documento: number;
  nombre: string;
  ficha: number;
}

const mockClientes: MockCliente[] = [];

interface MockVenta {
  idventa: number;
  precio: number;
  cliente: number;
  fechaventa: string;
  estado: 'Pendiente de Pago' | 'Pagado' | 'En Preparacion' | 'Listo para Entrega' | 'Entregado' | 'Cancelado';
  metodo_pago: 'Efectivo' | 'Transferencia';
  numero_pedido_diario?: number;
  referencia_pasarela?: string | null;
  created_at: string;
}

interface MockDetalleVenta {
  iddetalle: number;
  idventa: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
}

let nextIdVenta = 1;
let nextIdDetalle = 1;

const mockVentas: MockVenta[] = [];
const mockDetalleVenta: MockDetalleVenta[] = [];

interface MockBaja {
  idbaja: number;
  idproducto: number;
  cantidad: number;
  motivo: string;
  categoria: string;
  fecha: string;
  usuario_documento?: number;
  usuario_tipo?: string;
  created_at: string;
}

let nextIdBaja = 1;
const mockBajas: MockBaja[] = [];

interface MockAuditoria {
  idregistro: number;
  usuario: string;
  accion: string;
  entidad: string | null;
  detalle: string | null;
  timestamp: string;
}

let nextIdAuditoria = 1;
const mockAuditoria: MockAuditoria[] = [];

// Función para garantizar que el usuario admin@sena.edu.co / admin1234 exista siempre en Supabase
async function ensureAdminUser(): Promise<void> {
  const hashed = bcrypt.hashSync(DEFAULT_ADMIN_PASS, 10);

  // 1. Sincronizar en memoria
  const existingMock = mockAdmins.find(
    (a) => a.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
  );
  if (existingMock) {
    existingMock.clave = hashed;
    existingMock.activo = true;
  } else {
    mockAdmins.push({
      documento: DEFAULT_ADMIN_DOC,
      nombre: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      clave: hashed,
      rol: 'admin',
      activo: true,
    });
  }

  // 2. Si Supabase está conectado, asegurar existencia en la tabla 'admin'
  if (supabaseServer) {
    try {
      const { data: existing, error: findErr } = await supabaseServer
        .from('admin')
        .select('*')
        .eq('email', DEFAULT_ADMIN_EMAIL)
        .maybeSingle();

      if (!findErr && !existing) {
        const { error: insErr } = await supabaseServer.from('admin').insert({
          documento: DEFAULT_ADMIN_DOC,
          nombre: DEFAULT_ADMIN_NAME,
          email: DEFAULT_ADMIN_EMAIL,
          clave: hashed,
          rol: 'admin',
          activo: true,
        });
        if (insErr) {
          console.warn('[Supabase] Aviso al registrar admin inicial:', insErr.message);
        } else {
          console.log('[Supabase] Usuario admin@sena.edu.co creado exitosamente en tabla admin.');
        }
      } else if (existing) {
        if (!verifyPassword(existing.clave, DEFAULT_ADMIN_PASS)) {
          await supabaseServer
            .from('admin')
            .update({ clave: hashed, activo: true })
            .eq('email', DEFAULT_ADMIN_EMAIL);
          console.log('[Supabase] Credenciales de admin actualizadas a admin1234.');
        }
      }
    } catch (e: any) {
      console.warn('[Supabase] Aviso en ensureAdminUser:', e?.message || e);
    }
  }
}

// ---------------------------------------------------------------------------
// AUTH: LOGIN CON CONTRASEÑA REAL (bcryptjs + formatos Werkzeug/plano heredados)
// ---------------------------------------------------------------------------

function verifyPassword(stored: string | null | undefined, plain: string): boolean {
  if (!stored || !plain) return false;

  // 1) Hash bcrypt estándar ($2a$/$2b$/$2x$/$2y$) -> bcryptjs
  if (/^\$2[abxy]\$/.test(stored)) {
    try {
      return bcrypt.compareSync(plain, stored);
    } catch {
      return false;
    }
  }

  // 2) pbkdf2 de Werkzeug: pbkdf2:sha256:<iteraciones>$<salt>$<hash_base64>
  const pbkdf2Match = /^pbkdf2:sha256:(\d+)\$([^$]+)\$(.+)$/.exec(stored);
  if (pbkdf2Match) {
    try {
      const iterations = parseInt(pbkdf2Match[1], 10);
      const salt = pbkdf2Match[2];
      const expected = Buffer.from(pbkdf2Match[3], 'base64');
      const derived = pbkdf2Sync(plain, salt, iterations, expected.length, 'sha256');
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  // 3) scrypt de Werkzeug (>=2.3): scrypt:<N>:<r>:<p>$<salt>$<hash_base64>
  const scryptMatch = /^scrypt:(\d+):(\d+):(\d+)\$([^$]+)\$(.+)$/.exec(stored);
  if (scryptMatch) {
    try {
      const N = parseInt(scryptMatch[1], 10);
      const r = parseInt(scryptMatch[2], 10);
      const p = parseInt(scryptMatch[3], 10);
      const salt = scryptMatch[4];
      const expected = Buffer.from(scryptMatch[5], 'base64');
      const derived = scryptSync(plain, salt, expected.length, { N, r, p });
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  // 4) Contraseña en texto plano / demo
  return stored === plain;
}

function rolAplicacion(rol: string | null, esAdmin: boolean): 'Admin' | 'Cajero' | 'Despachador' | 'Auditor' {
  if (esAdmin) return 'Admin';
  switch (rol) {
    case 'cajero': return 'Cajero';
    case 'despachador': return 'Despachador';
    case 'auditor': return 'Auditor';
    default: return 'Admin';
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Ingresa el correo institucional o documento y tu contraseña.',
      });
    }

    // Asegurar que el usuario admin oficial siempre exista
    await ensureAdminUser();

    const termNorm = identifier.toLowerCase();
    const docNum = identifier.replace(/\D/g, '');

    let adminMatch: any = null;
    let personalMatch: any = null;

    if (supabaseServer) {
      try {
        const [{ data: adminRows }, { data: personalRows }] = await Promise.all([
          supabaseServer.from('admin').select('*'),
          supabaseServer.from('personal').select('*'),
        ]);

        adminMatch = (adminRows || []).find(
          (a) =>
            (a.email && a.email.toLowerCase() === termNorm) ||
            (docNum && String(a.documento) === docNum)
        );

        personalMatch = (personalRows || []).find(
          (p) =>
            (p.email && p.email.toLowerCase() === termNorm) ||
            (docNum && String(p.docpersonal) === docNum)
        );
      } catch (e) {
        console.warn('[auth] Error consultando Supabase, usando respaldo institucional:', e);
      }
    }

    // Si no hubo coincidencia en Supabase o estamos en modo mock local, buscar en memoria
    if (!adminMatch && !personalMatch) {
      adminMatch = mockAdmins.find(
        (a) =>
          a.email.toLowerCase() === termNorm ||
          (docNum && String(a.documento) === docNum)
      );
      personalMatch = mockPersonal.find(
        (p) =>
          p.email.toLowerCase() === termNorm ||
          (docNum && String(p.docpersonal) === docNum)
      );
    }

    const match = personalMatch || adminMatch;
    const esAdmin = !!adminMatch;

    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado en el directorio CGAO. Verifica tus datos con la Coordinación.',
      });
    }

    if (match.activo === false) {
      return res.status(401).json({
        success: false,
        error: 'La cuenta está actualmente INACTIVA. Comunícate con la administración.',
      });
    }

    if (!verifyPassword(match.clave, password)) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña incorrecta. Verifica tus credenciales e inténtalo de nuevo.',
      });
    }

    const rol = rolAplicacion(match.rol, esAdmin);
    const nombre = match.nombre || 'Personal CGAO';
    const email = match.email || identifier;

    // Registrar acceso en auditoría
    const auditEntry = {
      usuario: `${nombre} (${rol})`,
      accion: 'iniciar_sesion',
      entidad: 'Seguridad',
      detalle: `Inicio de sesión exitoso de ${nombre} con rol ${rol}.`,
    };

    if (supabaseServer) {
      try {
        await supabaseServer.from('registroauditoria').insert(auditEntry);
      } catch (audErr: any) {
        console.warn('[auth] No se pudo registrar auditoría de login en Supabase:', audErr?.message);
      }
    } else {
      mockAuditoria.unshift({
        idregistro: nextIdAuditoria++,
        ...auditEntry,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, rol, nombre, email });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error interno de autenticación.' });
  }
});

// Supabase Status Diagnostic Endpoint
app.get('/api/supabase/status', async (req, res) => {
  try {
    const startTime = Date.now();

    if (supabaseServer) {
      const { count, error } = await supabaseServer
        .from('producto')
        .select('*', { count: 'exact', head: true });

      const latency = Date.now() - startTime;

      if (error) {
        return res.status(200).json({
          connected: false,
          configured: true,
          error: error.message,
          url: SUPABASE_URL,
          latencyMs: latency,
        });
      }

      return res.json({
        connected: true,
        configured: true,
        url: SUPABASE_URL,
        publishableKeyPresent: !!SUPABASE_PUBLISHABLE_KEY,
        serviceRoleKeyPresent: !!SUPABASE_SERVICE_ROLE_KEY,
        totalProductos: count || 0,
        latencyMs: latency,
        database: 'PostgreSQL 15+ (Supabase)',
      });
    }

    // Modo inicial en espera de variables
    res.json({
      connected: false,
      configured: false,
      placeholderUrl: SUPABASE_URL || null,
      message: 'Base de datos Supabase esperando configuración de variables de entorno reales.',
      publishableKeyPresent: false,
      serviceRoleKeyPresent: false,
      totalProductos: mockProductos.length,
      latencyMs: 1,
      database: 'PostgreSQL 15+ (Supabase)',
    });
  } catch (err: any) {
    res.status(200).json({
      connected: false,
      configured: false,
      error: err.message,
      url: SUPABASE_URL || 'No configurada',
    });
  }
});

// Products API Proxy
app.get('/api/supabase/productos', async (req, res) => {
  try {
    if (supabaseServer) {
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '50'), 10);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabaseServer
        .from('producto')
        .select('*', { count: 'exact' })
        .eq('activo', true)
        .order('nombre')
        .range(from, to);

      if (!error && Array.isArray(data)) {
        return res.json({ success: true, data: data || [], total: count, page, limit });
      }
    }

    res.json({ success: true, data: mockProductos });
  } catch (err: any) {
    res.json({ success: true, data: mockProductos });
  }
});

// Bajas API Proxy (Read)
app.get('/api/supabase/bajas', async (req, res) => {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('bajainventario')
        .select('*, producto:idproducto(nombre, costo, categoria)')
        .order('idbaja', { ascending: false });

      if (!error && data) {
        return res.json({ success: true, data });
      }
    }

    const joinedBajas = mockBajas.map((b) => {
      const prod = mockProductos.find((p) => p.idproducto === b.idproducto);
      return {
        ...b,
        producto: prod ? { nombre: prod.nombre, costo: prod.costo, categoria: prod.categoria } : null,
      };
    });
    res.json({ success: true, data: joinedBajas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Products upsert (create/update)
app.post('/api/supabase/productos', async (req, res) => {
  try {
    const item = req.body;
    if (supabaseServer) {
      const { error } = await supabaseServer
        .from('producto')
        .upsert(item, { onConflict: 'idproducto' });
      if (error) console.warn('[supabase/productos] Upsert error in Supabase:', error.message);
    }

    const id = item.idproducto || (mockProductos.length ? Math.max(...mockProductos.map((p) => p.idproducto)) + 1 : 1);
    const existingIndex = mockProductos.findIndex((p) => p.idproducto === id);
    if (existingIndex >= 0) {
      mockProductos[existingIndex] = { ...mockProductos[existingIndex], ...item, idproducto: id };
    } else {
      mockProductos.push({ ...item, idproducto: id });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Product delete
app.delete('/api/supabase/productos/:id', async (req, res) => {
  try {
    const numericId = parseInt(req.params.id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'Id de producto inválido.' });
    }

    if (supabaseServer) {
      const { error } = await supabaseServer
        .from('producto')
        .delete()
        .eq('idproducto', numericId);
      if (error) console.warn('[supabase/productos] Delete error in Supabase:', error.message);
    }

    mockProductos = mockProductos.filter((p) => p.idproducto !== numericId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bajas insert
app.post('/api/supabase/bajas', async (req, res) => {
  try {
    if (supabaseServer) {
      const { error } = await supabaseServer
        .from('bajainventario')
        .insert(req.body);
      if (error) console.warn('[supabase/bajas] Insert error in Supabase:', error.message);
    }

    mockBajas.unshift({
      idbaja: nextIdBaja++,
      ...req.body,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auditoría insert
app.post('/api/supabase/auditoria', async (req, res) => {
  try {
    if (supabaseServer) {
      const { error } = await supabaseServer
        .from('registroauditoria')
        .insert(req.body);
      if (error) console.warn('[supabase/auditoria] Insert error in Supabase:', error.message);
    }

    mockAuditoria.unshift({
      idregistro: nextIdAuditoria++,
      ...req.body,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapOrderEstadoToDb(estado: string): MockVenta['estado'] {
  switch (estado) {
    case 'pago_confirmado': return 'Pagado';
    case 'en_preparacion': return 'En Preparacion';
    case 'listo_recoger': return 'Listo para Entrega';
    case 'entregado': return 'Entregado';
    default: return 'Pendiente de Pago';
  }
}

function mapMetodoPagoToDb(metodo: string): MockVenta['metodo_pago'] {
  switch (metodo) {
    case 'Transferencia': return 'Transferencia';
    case 'Efectivo': return 'Efectivo';
    default: return 'Efectivo';
  }
}

function parseDocumentoNumero(doc: unknown): number {
  const digits = String(doc || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Venta insert (+ detalleventa)
app.post('/api/supabase/ventas', async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.venta && !body.order) {
      return res.status(400).json({ success: false, error: 'Falta el objeto venta u order.' });
    }

    if (body.venta) {
      const { venta, items } = body;
      let idventa = nextIdVenta++;

      if (supabaseServer) {
        try {
          const { data, error } = await supabaseServer
            .from('venta')
            .insert(venta)
            .select('idventa')
            .single();
          if (!error && data?.idventa) {
            idventa = data.idventa;
          }
        } catch (e) {
          console.warn('[supabase/ventas] Insert error in Supabase:', e);
        }
      }

      mockVentas.unshift({
        idventa,
        precio: venta.precio || 0,
        cliente: venta.cliente || 0,
        fechaventa: new Date().toISOString(),
        estado: venta.estado || 'Pendiente de Pago',
        metodo_pago: venta.metodo_pago || 'Efectivo',
        numero_pedido_diario: (mockVentas.length % 99) + 1,
        referencia_pasarela: venta.referencia_pasarela || null,
        created_at: new Date().toISOString(),
      });

      if (Array.isArray(items)) {
        for (const item of items) {
          mockDetalleVenta.push({
            iddetalle: nextIdDetalle++,
            idventa,
            idproducto: item.idproducto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          });
        }
      }

      return res.json({ success: true, idventa });
    }

    // Contracto B: flujo desde objeto Order del Kiosco
    const order = body.order;
    const documento = parseDocumentoNumero(order?.cliente?.documento);

    // Garantizar cliente
    if (documento > 0) {
      const existing = mockClientes.find((c) => c.documento === documento);
      if (!existing) {
        mockClientes.push({
          documento,
          nombre: order.cliente.nombre || 'Cliente CGAO',
          ficha: parseDocumentoNumero(order.cliente.ficha) || 0,
        });
      }
    }

    let idventa = nextIdVenta++;
    const estadoDb = mapOrderEstadoToDb(order.estado);
    const metodoDb = mapMetodoPagoToDb(order.metodoPago);

    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer
          .from('venta')
          .insert({
            precio: order.total,
            cliente: documento,
            estado: estadoDb,
            metodo_pago: metodoDb,
            referencia_pasarela: order.codigoQR || null,
          })
          .select('idventa')
          .single();
        if (!error && data?.idventa) idventa = data.idventa;
      } catch (e) {
        console.warn('[supabase/ventas] Supabase insert error:', e);
      }
    }

    mockVentas.unshift({
      idventa,
      precio: order.total,
      cliente: documento,
      fechaventa: new Date().toISOString(),
      estado: estadoDb,
      metodo_pago: metodoDb,
      numero_pedido_diario: (mockVentas.length % 99) + 1,
      referencia_pasarela: order.codigoQR || null,
      created_at: new Date().toISOString(),
    });

    for (const item of order.items || []) {
      const prod = mockProductos.find((p) => p.nombre.toLowerCase() === item.nombre.toLowerCase());
      const prodId = prod ? prod.idproducto : 1;

      mockDetalleVenta.push({
        iddetalle: nextIdDetalle++,
        idventa,
        idproducto: prodId,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
      });

      // Descontar inventario local
      if (prod && prod.stock > 0) {
        prod.stock = Math.max(0, prod.stock - item.cantidad);
      }
    }

    res.json({ success: true, idventa });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Usuarios (admin + personal)
app.get('/api/supabase/usuarios', async (req, res) => {
  try {
    if (supabaseServer) {
      const [{ data: admins, error: aErr }, { data: personal, error: pErr }] = await Promise.all([
        supabaseServer
          .from('admin')
          .select('documento, nombre, email, rol, activo')
          .order('documento', { ascending: true }),
        supabaseServer
          .from('personal')
          .select('docpersonal, nombre, email, rol, activo')
          .order('docpersonal', { ascending: true }),
      ]);
      if (!aErr && !pErr) {
        return res.json({ success: true, data: { admins: admins || [], personal: personal || [] } });
      }
    }

    res.json({
      success: true,
      data: {
        admins: mockAdmins.map(({ clave, ...a }) => a),
        personal: mockPersonal.map(({ clave, ...p }) => p),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upsert de usuario/cliente
app.post('/api/supabase/usuarios', async (req, res) => {
  try {
    const { user } = req.body || {};
    if (!user) return res.status(400).json({ success: false, error: 'Falta el usuario.' });

    const doc = parseDocumentoNumero(user.documento);
    if (!doc) return res.status(400).json({ success: false, error: 'Documento inválido.' });

    if (user.rol === 'Cliente') {
      const existing = mockClientes.find((c) => c.documento === doc);
      if (existing) {
        existing.nombre = user.nombre;
        existing.ficha = parseDocumentoNumero(user.ficha || '') || 0;
      } else {
        mockClientes.push({
          documento: doc,
          nombre: user.nombre,
          ficha: parseDocumentoNumero(user.ficha || '') || 0,
        });
      }
      return res.json({ success: true });
    }

    const rolMap: Record<string, 'cajero' | 'despachador' | 'auditor'> = {
      Cajero: 'cajero',
      Despachador: 'despachador',
      Auditor: 'auditor',
    };
    const dbRol = rolMap[user.rol];
    if (!dbRol) return res.status(400).json({ success: false, error: 'Rol no reconocido.' });

    const existingPersonal = mockPersonal.find((p) => p.docpersonal === doc);
    if (existingPersonal) {
      existingPersonal.nombre = user.nombre;
      existingPersonal.email = user.email || existingPersonal.email;
      existingPersonal.rol = dbRol;
      existingPersonal.activo = user.activo !== false;
    } else {
      mockPersonal.push({
        docpersonal: doc,
        nombre: user.nombre,
        email: user.email || `${dbRol}@sena.edu.co`,
        clave: '123456',
        rol: dbRol,
        activo: user.activo !== false,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auditoría - últimos 100 registros
app.get('/api/supabase/auditoria', async (req, res) => {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('registroauditoria')
        .select('*')
        .order('idregistro', { ascending: false })
        .limit(100);
      if (!error && data) {
        return res.json({ success: true, data });
      }
    }

    res.json({ success: true, data: mockAuditoria });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cliente por documento (kiosko de identificación)
app.get('/api/supabase/clientes/:documento', async (req, res) => {
  try {
    const doc = parseDocumentoNumero(req.params.documento);
    if (!doc) return res.status(400).json({ success: false, error: 'Documento inválido.' });

    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('cliente')
        .select('documento, nombre, ficha')
        .eq('documento', doc)
        .maybeSingle();
      if (!error && data) {
        return res.json({ success: true, data });
      }
    }

    const cliente = mockClientes.find((c) => c.documento === doc) || null;
    res.json({ success: true, data: cliente });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upsert de cliente (kiosko de identificación)
app.post('/api/supabase/clientes', async (req, res) => {
  try {
    const { documento, nombre, ficha } = req.body || {};
    const doc = parseDocumentoNumero(documento);
    if (!doc) return res.status(400).json({ success: false, error: 'Documento inválido.' });

    if (supabaseServer) {
      await supabaseServer
        .from('cliente')
        .upsert(
          { documento: doc, nombre: nombre || 'Cliente CGAO', ficha: parseDocumentoNumero(ficha) || 0 },
          { onConflict: 'documento' }
        );
    }

    const existing = mockClientes.find((c) => c.documento === doc);
    if (existing) {
      existing.nombre = nombre || existing.nombre;
      existing.ficha = parseDocumentoNumero(ficha) || existing.ficha;
    } else {
      mockClientes.push({
        documento: doc,
        nombre: nombre || 'Cliente CGAO',
        ficha: parseDocumentoNumero(ficha) || 0,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper para armar ventas con relaciones
function formatMockVentas(ventasList: MockVenta[]) {
  return ventasList.map((v) => {
    const cliente = mockClientes.find((c) => c.documento === v.cliente) || {
      nombre: `Cliente #${v.cliente}`,
      ficha: 0,
    };
    const detalles = mockDetalleVenta
      .filter((d) => d.idventa === v.idventa)
      .map((d) => {
        const prod = mockProductos.find((p) => p.idproducto === d.idproducto);
        return {
          idproducto: d.idproducto,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          producto: { nombre: prod?.nombre || 'Producto CGAO' },
        };
      });

    return {
      ...v,
      cliente: { nombre: cliente.nombre, ficha: cliente.ficha },
      detalleventa: detalles,
    };
  });
}

// Ultimas ventas para Caja POS y Metricas
app.get('/api/supabase/ventas', async (req, res) => {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('venta')
        .select('*, cliente:cliente(nombre, ficha), detalleventa(producto:producto(nombre))')
        .order('idventa', { ascending: false })
        .limit(60);
      if (!error && Array.isArray(data)) {
        return res.json({ success: true, data });
      }
    }

    res.json({ success: true, data: formatMockVentas(mockVentas) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Despacho: tickets activos
app.get('/api/supabase/despacho', async (req, res) => {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('venta')
        .select('*, cliente:cliente(nombre, ficha), detalleventa(producto:producto(nombre))')
        .in('estado', ['Pagado', 'En Preparacion', 'Listo para Entrega', 'Entregado'])
        .order('idventa', { ascending: false })
        .limit(40);
      if (!error && Array.isArray(data)) {
        return res.json({ success: true, data });
      }
    }

    const filtered = mockVentas.filter((v) =>
      ['Pagado', 'En Preparacion', 'Listo para Entrega', 'Entregado'].includes(v.estado)
    );
    res.json({ success: true, data: formatMockVentas(filtered) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar estado de una venta
app.patch('/api/supabase/ventas/:id/estado', async (req, res) => {
  try {
    const idventa = parseInt(req.params.id, 10);
    if (isNaN(idventa)) return res.status(400).json({ success: false, error: 'Id de venta inválido.' });
    const { estado } = req.body || {};
    if (!estado) return res.status(400).json({ success: false, error: 'Falta el nuevo estado.' });

    if (supabaseServer) {
      await supabaseServer
        .from('venta')
        .update({ estado })
        .eq('idventa', idventa);
    }

    const v = mockVentas.find((m) => m.idventa === idventa);
    if (v) v.estado = estado;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware & Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Cafetería CGAO Server running on http://0.0.0.0:${PORT}`);
    await ensureAdminUser();
    if (supabaseServer) {
      console.log(`Supabase vinculado: ${SUPABASE_URL}`);
    } else {
      console.log('Modo autónomo en memoria activo (desarrollo y pruebas)');
    }
  });

  const handleShutdown = (signal: string) => {
    console.log(`Recibida señal ${signal}. Cerrando servidor limpiamente...`);
    server.close(() => {
      console.log('Servidor cerrado.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Cierre forzado por timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();

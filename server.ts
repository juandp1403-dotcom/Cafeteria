import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { scryptSync, pbkdf2Sync, timingSafeEqual } from 'crypto';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Hardening
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

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
  res.json({ status: 'ok', service: 'Cafetería SENA CGAO Backend' });
});

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

  // 4) Legado: contraseña almacenada en texto plano
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

    const termNorm = identifier.toLowerCase();
    const docNum = identifier.replace(/\D/g, '');

    // Cargar candidatos de ambas tablas y resolver por email o documento
    const [{ data: adminRows }, { data: personalRows }] = await Promise.all([
      supabaseServer.from('admin').select('*'),
      supabaseServer.from('personal').select('*'),
    ]);

    const adminMatch = (adminRows || []).find(
      (a) =>
        (a.email && a.email.toLowerCase() === termNorm) ||
        (docNum && String(a.documento) === docNum)
    );

    const personalMatch = (personalRows || []).find(
      (p) =>
        (p.email && p.email.toLowerCase() === termNorm) ||
        (docNum && String(p.docpersonal) === docNum)
    );

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

    // Registrar acceso en auditoría (best-effort)
    try {
      await supabaseServer.from('registroauditoria').insert({
        usuario: `${nombre} (${rol})`,
        accion: 'iniciar_sesion',
        entidad: 'Seguridad',
        detalle: `Inicio de sesión exitoso de ${nombre} con rol ${rol}.`,
      });
    } catch (audErr: any) {
      console.warn('[auth] No se pudo registrar auditoría de login:', audErr?.message);
    }

    res.json({ success: true, rol, nombre, email });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error interno de autenticación.' });
  }
});

// Server-side Supabase client credentials come ONLY from process.env (no hardcoded fallbacks)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[Supabase] Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno. ' +
    'Configura el archivo .env antes de iniciar el servidor.'
  );
  throw new Error('Supabase no configurado: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseServer = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Supabase Status Diagnostic Endpoint
app.get('/api/supabase/status', async (req, res) => {
  try {
    const startTime = Date.now();
    const { count, error } = await supabaseServer
      .from('producto')
      .select('*', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      return res.status(500).json({
        connected: false,
        error: error.message,
        url: SUPABASE_URL,
        latencyMs: latency,
      });
    }

    res.json({
      connected: true,
      url: SUPABASE_URL,
      publishableKeyPresent: !!SUPABASE_PUBLISHABLE_KEY,
      serviceRoleKeyPresent: !!SUPABASE_SERVICE_ROLE_KEY,
      totalProductos: count || 0,
      latencyMs: latency,
      database: 'PostgreSQL 15+ (Supabase)',
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message,
      url: SUPABASE_URL,
    });
  }
});

// Products API Proxy
app.get('/api/supabase/productos', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('producto')
      .select('*')
      .order('idproducto', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bajas API Proxy (Read)
app.get('/api/supabase/bajas', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('bajainventario')
      .select('*, producto:idproducto(nombre, costo, categoria)')
      .order('idbaja', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ESCRITURAS ENABLED (productos, bajas, ventas, auditoría)
// ---------------------------------------------------------------------------

// Products upsert (create/update)
app.post('/api/supabase/productos', async (req, res) => {
  try {
    const { error } = await supabaseServer
      .from('producto')
      .upsert(req.body, { onConflict: 'idproducto' });
    if (error) throw error;
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
    const { error } = await supabaseServer
      .from('producto')
      .delete()
      .eq('idproducto', numericId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bajas insert
app.post('/api/supabase/bajas', async (req, res) => {
  try {
    const { error } = await supabaseServer
      .from('bajainventario')
      .insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auditoría insert
app.post('/api/supabase/auditoria', async (req, res) => {
  try {
    const { error } = await supabaseServer
      .from('registroauditoria')
      .insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Venta insert (+ detalleventa).
// Contracto A (legacy): { venta: object, items: Array<{ idproducto, cantidad, precio_unitario }> }
// Contracto B (kiosco POS): { order: Order } -> garantiza cliente, inserta venta y
//   resuelve el idproducto por nombre para cada detalle. Retorna idventa.
function mapOrderEstadoToDb(estado: string): string {
  switch (estado) {
    case 'pago_confirmado': return 'Pagado';
    case 'en_preparacion': return 'En Preparacion';
    case 'listo_recoger': return 'Listo para Entrega';
    case 'entregado': return 'Entregado';
    default: return 'Pendiente de Pago';
  }
}

function mapMetodoPagoToDb(metodo: string): string {
  switch (metodo) {
    case 'Billetera Digital SENA': return 'Saldo';
    case 'Nequi': return 'Nequi';
    case 'Efectivo': return 'Efectivo';
    case 'Datáfono': return 'Bancolombia';
    default: return 'Efectivo';
  }
}

function parseDocumentoNumero(doc: unknown): number {
  const digits = String(doc || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

app.post('/api/supabase/ventas', async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.venta && !body.order) {
      return res.status(400).json({ success: false, error: 'Falta el objeto venta u order.' });
    }

    // Contracto A (legacy): insertar cabecera + detalle directo
    if (body.venta) {
      const { venta, items } = body;
      const { data, error } = await supabaseServer
        .from('venta')
        .insert(venta)
        .select('idventa')
        .single();
      if (error) throw error;

      const idventa = data?.idventa;
      if (idventa && Array.isArray(items)) {
        for (const item of items) {
          const { error: detError } = await supabaseServer
            .from('detalleventa')
            .insert({ ...item, idventa });
          if (detError) {
            console.warn('[supabase/ventas] detalle omitido:', detError.message);
          }
        }
      }
      return res.json({ success: true, idventa });
    }

    // Contracto B: flujo completo desde el objeto Order del kiosco
    const order = body.order;
    const documento = parseDocumentoNumero(order?.cliente?.documento);

    // 1. Garantizar cliente (FK cliente.documento)
    if (documento > 0) {
      const { data: existingCliente } = await supabaseServer
        .from('cliente')
        .select('documento')
        .eq('documento', documento)
        .maybeSingle();
      if (!existingCliente) {
        const { error: clienteError } = await supabaseServer
          .from('cliente')
          .upsert(
            {
              documento,
              nombre: order.cliente.nombre || 'Cliente CGAO',
              ficha: parseDocumentoNumero(order.cliente.ficha) || 0,
            },
            { onConflict: 'documento' }
          );
        if (clienteError) {
          console.warn('[supabase/ventas] no se pudo garantizar cliente:', clienteError.message);
        }
      }
    }

    // 2. Insertar cabecera de venta
    const { data: ventaData, error: ventaError } = await supabaseServer
      .from('venta')
      .insert({
        precio: order.total,
        cliente: documento,
        estado: mapOrderEstadoToDb(order.estado),
        metodo_pago: mapMetodoPagoToDb(order.metodoPago),
        referencia_pasarela: order.codigoQR || null,
      })
      .select('idventa')
      .single();
    if (ventaError || !ventaData) throw ventaError;

    const idventa = ventaData.idventa;

    // 3. Insertar el detalle, resolviendo idproducto por nombre
    for (const item of order.items || []) {
      const { data: prod } = await supabaseServer
        .from('producto')
        .select('idproducto')
        .eq('nombre', item.nombre)
        .maybeSingle();
      if (!prod) {
        console.warn(`[supabase/ventas] Producto no encontrado para detalle: "${item.nombre}"`);
        continue;
      }
      const { error: detalleError } = await supabaseServer
        .from('detalleventa')
        .insert({
          idventa,
          idproducto: prod.idproducto,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
        });
      if (detalleError) {
        console.warn('[supabase/ventas] detalle omitido:', detalleError.message);
      }
    }

    res.json({ success: true, idventa });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Usuarios (admin + personal) - SOLO lectura, sin el campo clave
app.get('/api/supabase/usuarios', async (req, res) => {
  try {
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
    if (aErr || pErr) throw aErr || pErr;
    res.json({ success: true, data: { admins: admins || [], personal: personal || [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upsert de usuario/cliente desde Gestión de Usuarios
app.post('/api/supabase/usuarios', async (req, res) => {
  try {
    const { user } = req.body || {};
    if (!user) return res.status(400).json({ success: false, error: 'Falta el usuario.' });

    const doc = parseDocumentoNumero(user.documento);
    if (!doc) return res.status(400).json({ success: false, error: 'Documento inválido.' });

    if (user.rol === 'Cliente') {
      const { error } = await supabaseServer
        .from('cliente')
        .upsert(
          { documento: doc, nombre: user.nombre, ficha: parseDocumentoNumero(user.ficha || '') || 0 },
          { onConflict: 'documento' }
        );
      if (error) throw error;
      return res.json({ success: true });
    }

    if (user.rol === 'Admin') {
      return res.status(400).json({
        success: false,
        error: 'El alta de Admins requiere contraseña (columna admin.clave). Asigna la credencial directamente en Supabase.',
      });
    }

    const rolMap: Record<string, 'cajero' | 'despachador' | 'auditor'> = {
      Cajero: 'cajero',
      Despachador: 'despachador',
      Auditor: 'auditor',
    };
    const dbRol = rolMap[user.rol];
    if (!dbRol) return res.status(400).json({ success: false, error: 'Rol no reconocido.' });

    const { error } = await supabaseServer
      .from('personal')
      .upsert(
        {
          docpersonal: doc,
          nombre: user.nombre,
          email: user.email || null,
          rol: dbRol,
          activo: user.activo !== false,
        },
        { onConflict: 'docpersonal' }
      );
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auditoría - últimos 100 registros
app.get('/api/supabase/auditoria', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('registroauditoria')
      .select('*')
      .order('idregistro', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cliente por documento (kiosko de identificación)
app.get('/api/supabase/clientes/:documento', async (req, res) => {
  try {
    const doc = parseDocumentoNumero(req.params.documento);
    if (!doc) return res.status(400).json({ success: false, error: 'Documento inválido.' });
    const { data, error } = await supabaseServer
      .from('cliente')
      .select('documento, nombre, ficha')
      .eq('documento', doc)
      .maybeSingle();
    if (error) throw error;
    res.json({ success: true, data: data || null });
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
    const { error } = await supabaseServer
      .from('cliente')
      .upsert(
        { documento: doc, nombre: nombre || 'Cliente CGAO', ficha: parseDocumentoNumero(ficha) || 0 },
        { onConflict: 'documento' }
      );
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ultimas ventas (con cliente y detalle) para Caja POS y Metricas
app.get('/api/supabase/ventas', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('venta')
      .select('*, cliente:cliente(nombre, ficha), detalleventa(producto:producto(nombre))')
      .order('idventa', { ascending: false })
      .limit(60);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Despacho: tickets activos (Pagado / En Preparacion / Listo / Entregado)
app.get('/api/supabase/despacho', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('venta')
      .select('*, cliente:cliente(nombre, ficha), detalleventa(producto:producto(nombre))')
      .in('estado', ['Pagado', 'En Preparacion', 'Listo para Entrega', 'Entregado'])
      .order('idventa', { ascending: false })
      .limit(40);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar estado de una venta (cobro / avance de despacho)
app.patch('/api/supabase/ventas/:id/estado', async (req, res) => {
  try {
    const idventa = parseInt(req.params.id, 10);
    if (isNaN(idventa)) return res.status(400).json({ success: false, error: 'Id de venta inválido.' });
    const { estado } = req.body || {};
    if (!estado) return res.status(400).json({ success: false, error: 'Falta el nuevo estado.' });
    const { error } = await supabaseServer
      .from('venta')
      .update({ estado })
      .eq('idventa', idventa);
    if (error) throw error;
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cafetería CGAO Server running on http://0.0.0.0:${PORT}`);
    console.log(`Supabase linked (Read/Write Mode): ${SUPABASE_URL}`);
  });

  // Graceful shutdown handling for Docker and Coolify containers
  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}. Closing server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force close if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();

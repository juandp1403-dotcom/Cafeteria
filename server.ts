import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

// Initialize server-side Supabase client with SECRET KEY
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://avwoaoxbxgbgvgqgvizo.supabase.co';
const rawSecret = process.env.SUPABASE_SECRET_KEY || '';
const SUPABASE_SECRET_KEY = (rawSecret.length >= 35) ? rawSecret : 'sb_secret_YHflb-cP7Acbfw7f1RMrKQ_pvZfVRyD';
const rawPub = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_PUBLISHABLE_KEY = (rawPub.length >= 35) ? rawPub : 'sb_publishable_jyF6iE-KjmN5S0sPAlMVmg_hiZeb50Z';

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
  realtime: { createClient: () => null as any },
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
      secretKeyPresent: !!SUPABASE_SECRET_KEY,
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

// Bajas API Proxy (Read-Only)
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

// Write endpoints are strictly blocked to guarantee zero inserts/updates to the database
app.all(['/api/supabase/productos', '/api/supabase/bajas', '/api/supabase/ventas', '/api/supabase/auditoria', '/api/supabase/productos/:id'], (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(403).json({
      success: false,
      error: 'Operación bloqueada: la base de datos opera en modo estrictamente de solo lectura (sin inserts/mutaciones).',
    });
  }
  next();
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
    console.log(`Supabase linked (Read-Only Mode): ${SUPABASE_URL}`);
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

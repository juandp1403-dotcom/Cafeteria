/**
 * Mock de `fetch` para probar los adaptadores de `src/lib/supabase.ts` y los
 * componentes que consumen la API Express, sin necesidad de un backend real.
 *
 * Registra todas las llamadas (URL, método, body) para poder asertar sobre ellas,
 * y devuelve por defecto `{ success: true, data: [] }` para cualquier ruta no
 * configurada.
 */
import { vi } from 'vitest';

export interface RecordedCall {
  url: string;
  method: string;
  path: string;
  body: unknown;
}

export interface ApiMockOverride {
  /** Sustinga de la URL (ej. '/api/supabase/productos', '/pedidos'). */
  match: string;
  /** Método HTTP; si se omite aplica a todos. */
  method?: string;
  status?: number;
  /** Cuerpo JSON. */
  body?: unknown;
  /** Respuesta cruda no-JSON (simula el HTML del catch-all de Express). */
  text?: string;
}

export interface ApiMockOptions {
  /**
   * Respuestas crudas con prioridad sobre el enrutamiento por defecto.
   * Útil para simular `success:false`, respuestas no-JSON o errores por ruta.
   */
  overrides?: ApiMockOverride[];
  /** GET /api/supabase/status */
  status?: Record<string, unknown>;
  /** GET /api/supabase/productos */
  productos?: unknown;
  /** POST /api/supabase/productos -> { success, idproducto } */
  productosSave?: Record<string, unknown>;
  /** POST /api/auth/login */
  login?: Record<string, unknown>;
  /** GET /api/supabase/bajas */
  bajas?: unknown;
  /** POST /api/supabase/bajas */
  bajasSave?: Record<string, unknown>;
  /** GET /api/supabase/auditoria */
  auditoria?: unknown;
  /** POST /api/supabase/auditoria */
  auditoriaSave?: Record<string, unknown>;
  /** GET /api/supabase/ventas */
  ventas?: unknown;
  /** POST /api/supabase/ventas */
  ventasSave?: Record<string, unknown>;
  /** GET /api/supabase/ventas/turno-actual -> { success, numero } */
  turnoActual?: number;
  /** PATCH /api/supabase/ventas/:id/estado */
  ventaEstado?: Record<string, unknown>;
  /** GET /api/supabase/despacho */
  despacho?: unknown;
  /** GET /api/supabase/usuarios */
  usuarios?: unknown;
  /** POST /api/supabase/usuarios */
  usuariosSave?: Record<string, unknown>;
  /** GET /api/supabase/clientes/:documento -> { success, data } */
  cliente?: Record<string, unknown>;
  /** POST /api/supabase/clientes */
  clienteSave?: Record<string, unknown>;
  /** Fuerza un error de red (rechaza la promesa fetch). */
  networkError?: boolean;
  /** Fuerza respuestas HTTP 500 en todas las rutas. */
  httpError?: boolean;
}

export interface ApiMock {
  calls: RecordedCall[];
  fetchMock: ReturnType<typeof vi.fn>;
  /** Llamadas filtradas por método + coincidencia de path. */
  callsTo(pathPart: string, method?: string): RecordedCall[];
  /** Última llamada registrada. */
  lastCall(): RecordedCall | undefined;
  restore(): void;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
    text: async () => text,
  } as unknown as Response;
}

function overrideResponse(ov: ApiMockOverride): Response {
  return ov.text !== undefined
    ? textResponse(ov.text, ov.status ?? 200)
    : jsonResponse(ov.body, ov.status ?? 200);
}

function parseBody(init?: RequestInit): unknown {
  if (!init || typeof init.body !== 'string') return undefined;
  try {
    return JSON.parse(init.body);
  } catch {
    return init.body;
  }
}

/**
 * Instala el mock global de `fetch`. Devuelve el registro de llamadas y el mock,
 * para poder inspeccionarlo desde los tests.
 */
export function installApiMock(options: ApiMockOptions = {}): ApiMock {
  const calls: RecordedCall[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '');

    calls.push({ url, method, path, body: parseBody(init) });

    // Los overrides por ruta ganan sobre todo lo demás.
    const ov = options.overrides?.find(
      (o) => path.includes(o.match) && (!o.method || o.method.toUpperCase() === method)
    );
    if (ov) return overrideResponse(ov);

    if (options.networkError) {
      throw new TypeError('Failed to fetch');
    }

    // `httpError` simula un backend caído: TODA ruta responde 500.
    if (options.httpError) {
      return jsonResponse({ success: false, error: 'Error simulado del servidor' }, 500);
    }

    // Orden importante: /ventas/turno-actual debe resolverse antes que /ventas.
    if (path.includes('/api/supabase/ventas/turno-actual') && method === 'GET') {
      return jsonResponse({ success: true, numero: options.turnoActual ?? 1 });
    }

    if (path.includes('/api/supabase/status')) {
      return jsonResponse(
        options.status ?? {
          connected: true,
          configured: true,
          url: 'https://proyecto.supabase.co',
          publishableKeyPresent: true,
          serviceRoleKeyPresent: true,
          totalProductos: 3,
          latencyMs: 12,
          database: 'PostgreSQL 15+ (Supabase)',
        }
      );
    }

    if (path.includes('/api/auth/login')) {
      return options.login
        ? jsonResponse(options.login)
        : jsonResponse({ success: false, error: 'Credenciales no válidas' }, 401);
    }

    if (path.includes('/api/supabase/clientes/') && method === 'GET') {
      return jsonResponse(
        options.cliente ?? { success: true, data: { nombre: 'María Pérez', ficha: 2671234 } }
      );
    }

    if (path.includes('/api/supabase/clientes') && method === 'POST') {
      return jsonResponse(options.clienteSave ?? { success: true });
    }

    if (path.includes('/api/supabase/productos') && method === 'POST') {
      return jsonResponse(options.productosSave ?? { success: true, idproducto: 42 });
    }

    if (path.includes('/api/supabase/productos') && method === 'GET') {
      return jsonResponse({ success: true, data: options.productos ?? [] });
    }

    if (path.includes('/api/supabase/bajas') && method === 'POST') {
      return jsonResponse(options.bajasSave ?? { success: true });
    }

    if (path.includes('/api/supabase/bajas') && method === 'GET') {
      return jsonResponse({ success: true, data: options.bajas ?? [] });
    }

    if (path.includes('/api/supabase/auditoria') && method === 'POST') {
      return jsonResponse(options.auditoriaSave ?? { success: true });
    }

    if (path.includes('/api/supabase/auditoria') && method === 'GET') {
      return jsonResponse({ success: true, data: options.auditoria ?? [] });
    }

    if (path.includes('/api/supabase/ventas') && method === 'PATCH') {
      return jsonResponse(options.ventaEstado ?? { success: true });
    }

    if (path.includes('/api/supabase/ventas') && method === 'POST') {
      return jsonResponse(options.ventasSave ?? { success: true, idventa: 101, numeroPedido: 42 });
    }

    if (path.includes('/api/supabase/ventas') && method === 'GET') {
      return jsonResponse({ success: true, data: options.ventas ?? [] });
    }

    if (path.includes('/api/supabase/despacho')) {
      return jsonResponse({ success: true, data: options.despacho ?? [] });
    }

    if (path.includes('/api/supabase/usuarios') && method === 'POST') {
      return jsonResponse(options.usuariosSave ?? { success: true, id: 'uuid-mock' });
    }

    if (path.includes('/api/supabase/usuarios') && method === 'GET') {
      return jsonResponse(options.usuarios ?? { success: true, data: { admins: [], personal: [] } });
    }

    return jsonResponse({ success: true, data: [] });
  });

  vi.stubGlobal('fetch', fetchMock);

  return {
    calls,
    fetchMock,
    callsTo: (pathPart, method) =>
      calls.filter(
        (c) => c.path.includes(pathPart) && (!method || c.method === method.toUpperCase())
      ),
    lastCall: () => calls[calls.length - 1],
    restore: () => vi.unstubAllGlobals(),
  };
}

/**
 * Stub del cliente Supabase (`auth` / `from`) para probar el alta de usuarios.
 * Los `upsert` quedan registrados en `upserts[tabla]`.
 */
export function makeSupabaseAuthStub() {
  const upserts: Record<string, unknown[]> = {};
  return {
    upserts,
    client: {
      auth: {
        signUp: vi.fn(async () => ({ data: { user: { id: 'auth-uuid-1' } }, error: null })),
      },
      from(table: string) {
        return {
          upsert: vi.fn(async (payload: unknown) => {
            (upserts[table] ||= []).push(payload);
            return { data: payload, error: null };
          }),
          select: vi.fn(() => ({ maybeSingle: async () => ({ data: null, error: null }) })),
        };
      },
    },
  };
}
// @vitest-environment jsdom
/**
 * Tests de los adaptadores de RED de `src/lib/supabase.ts`.
 *
 * Verifica qué ruta HTTP se llama, con qué método y body, y cómo se traducen
 * errores (HTTP no-2xx y fallos de red) a los valores de retorno que el resto de
 * la app espera (`null`, `false`, `[]`, `{ ok: false }`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkSupabaseHealth,
  deleteProductFromSupabase,
  ensureClienteToSupabase,
  fetchAuditLogsFromSupabase,
  fetchBajasFromSupabase,
  fetchClienteFromSupabase,
  fetchPOSOrdersFromSupabase,
  fetchProductsFromSupabase,
  fetchTicketsDespachoFromSupabase,
  fetchUsersFromSupabase,
  fetchVentasFromSupabase,
  recordAuditToSupabase,
  recordVentaToSupabase,
  saveBajaToSupabase,
  saveProductToSupabase,
  updateVentaEstadoToSupabase,
} from '../../src/lib/supabase';
import { installApiMock, type ApiMock, type ApiMockOptions } from '../helpers/api-mock';
import { makeAuditLog, makeBaja, makeDbProducto, makeDbVenta, makeOrder, makeProduct } from '../helpers/fixtures';

let api: ApiMock;

function setup(options: ApiMockOptions = {}) {
  api = installApiMock(options);
  return api;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  api?.restore();
});

// ---------------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------------

describe('fetchProductsFromSupabase', () => {
  it('llama GET /api/supabase/productos y mapea las filas a ProductItem', async () => {
    setup({ productos: [makeDbProducto(), makeDbProducto({ idproducto: 8, nombre: 'Jugo de Naranja' })] });

    const items = await fetchProductsFromSupabase();

    expect(api.callsTo('/api/supabase/productos', 'GET')).toHaveLength(1);
    expect(items).toHaveLength(2);
    expect(items?.[0].id).toBe('prod-7');
    expect(items?.[1].nombre).toBe('Jugo de Naranja');
  });

  it('devuelve null si la API responde success:false', async () => {
    setup({ overrides: [{ match: '/api/supabase/productos', body: { success: false } }] });
    expect(await fetchProductsFromSupabase()).toBeNull();
  });

  it('devuelve null si data no es un arreglo', async () => {
    setup({ productos: { success: true, data: { nope: true } } as any });
    expect(await fetchProductsFromSupabase()).toBeNull();
  });
});

describe('saveProductToSupabase', () => {
  it('hace POST del payload mapeado y devuelve el idproducto asignado', async () => {
    setup({ productosSave: { success: true, idproducto: 99 } });

    const result = await saveProductToSupabase(makeProduct({ id: 'prod-77' }));

    const call = api.lastCall();
    expect(call?.method).toBe('POST');
    expect(call?.path).toBe('/api/supabase/productos');
    expect((call?.body as any).idproducto).toBe(77);
    expect(result).toEqual({ ok: true, idproducto: 99 });
  });

  it('envía el producto SIN idproducto cuando es nuevo', async () => {
    setup();
    await saveProductToSupabase(makeProduct({ id: `prod-${Date.now()}` }));
    expect((api.lastCall()?.body as any).idproducto).toBeUndefined();
  });

  it('devuelve { ok:false } si el servidor responde 500', async () => {
    setup({ httpError: true });
    expect(await saveProductToSupabase(makeProduct())).toEqual({ ok: false });
  });
});

describe('deleteProductFromSupabase', () => {
  it('acepta el objeto ProductItem y borra por id numérico', async () => {
    setup();
    const ok = await deleteProductFromSupabase(makeProduct({ id: 'prod-12' }));

    expect(ok).toBe(true);
    expect(api.lastCall()?.method).toBe('DELETE');
    expect(api.lastCall()?.path).toBe('/api/supabase/productos/12');
  });

  it('acepta directamente el string id', async () => {
    setup();
    await deleteProductFromSupabase('prod-33');
    expect(api.lastCall()?.path).toBe('/api/supabase/productos/33');
  });

  it('devuelve false sin llamar a la API cuando el id no es numérico', async () => {
    setup();
    expect(await deleteProductFromSupabase('prod-nuevo')).toBe(false);
    expect(api.calls).toHaveLength(0);
  });

  it('devuelve false si el servidor rechaza el borrado', async () => {
    setup({ httpError: true });
    expect(await deleteProductFromSupabase('prod-12')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BAJAS / MERMAS
// ---------------------------------------------------------------------------

describe('fetchBajasFromSupabase', () => {
  it('mapea las bajas con el producto relacionado (nombre y costo)', async () => {
    setup({
      bajas: [
        {
          idbaja: 5,
          idproducto: 7,
          cantidad: 3,
          motivo: 'Merma de cocción / preparación en cocina',
          categoria: 'Mermas Cocina',
          fecha: '2026-09-17T10:30:00Z',
          usuario_tipo: 'Cajero',
          usuario_documento: 1098765432,
          producto: { nombre: 'Empanada Artesanal', costo: 3000, categoria: 'comida_rapida' },
        },
      ],
    });

    const bajas = await fetchBajasFromSupabase();

    expect(bajas).toHaveLength(1);
    expect(bajas?.[0]).toMatchObject({
      id: 'baja-5',
      productoId: 'prod-7',
      productoNombre: 'Empanada Artesanal',
      categoria: 'Mermas Cocina',
      cantidad: 3,
      costoUnitario: 3000,
      costoTotal: 9000,
      motivo: 'Merma de cocción / preparación en cocina',
      responsable: 'Cajero (1098765432)',
    });
    expect(bajas?.[0].observaciones).toContain('#5');
  });

  it('cae a costo unitario por defecto si la relación con producto viene vacía', async () => {
    setup({ bajas: [{ idbaja: 1, idproducto: 999, cantidad: 2, motivo: 'x', categoria: 'y' }] });
    const bajas = await fetchBajasFromSupabase();
    expect(bajas?.[0].costoUnitario).toBe(1500);
    expect(bajas?.[0].productoNombre).toBe('Producto #999');
  });

  it('devuelve null si la API falla', async () => {
    setup({ httpError: true });
    expect(await fetchBajasFromSupabase()).toBeNull();
  });
});

describe('saveBajaToSupabase', () => {
  it('hace POST del payload de baja y devuelve true', async () => {
    setup();
    expect(await saveBajaToSupabase(makeBaja())).toBe(true);
    expect(api.lastCall()?.method).toBe('POST');
    expect(api.lastCall()?.path).toBe('/api/supabase/bajas');
  });

  it('devuelve false si el servidor responde error', async () => {
    setup({ httpError: true });
    expect(await saveBajaToSupabase(makeBaja())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AUDITORÍA
// ---------------------------------------------------------------------------

describe('recordAuditToSupabase', () => {
  it('serializa el log institucional (usuario con rol, entidad, detalle, timestamp)', async () => {
    setup();
    const log = makeAuditLog({ timestamp: Date.parse('2026-09-17T15:00:00Z') });

    expect(await recordAuditToSupabase(log)).toBe(true);

    const body = api.lastCall()?.body as any;
    expect(api.lastCall()?.path).toBe('/api/supabase/auditoria');
    expect(body.usuario).toBe('Laura Gómez (Admin)');
    expect(body.accion).toBe(log.accion);
    expect(body.entidad).toBe('Inventario');
    expect(body.detalle).toBe(log.detalle);
    expect(body.timestamp).toBe('2026-09-17T15:00:00.000Z');
  });

  it('devuelve false si el servidor responde error', async () => {
    setup({ httpError: true });
    expect(await recordAuditToSupabase(makeAuditLog())).toBe(false);
  });
});

describe('fetchAuditLogsFromSupabase', () => {
  it('mapea la bitácora separando nombre de usuario y rol', async () => {
    setup({
      auditoria: [
        {
          idregistro: 12,
          usuario: 'Laura Gómez (Admin)',
          accion: 'Alta de Nuevo Producto en Catálogo',
          entidad: 'Inventario',
          detalle: 'Detalle de prueba',
          timestamp: '2026-09-17T15:00:00Z',
        },
      ],
    });

    const logs = await fetchAuditLogsFromSupabase();

    expect(logs).toHaveLength(1);
    expect(logs?.[0].id).toBe('aud-12');
    expect(logs?.[0].usuario).toBe('Laura Gómez');
    expect(logs?.[0].rol).toBe('Admin');
    expect(logs?.[0].modulo).toBe('Inventario');
    expect(logs?.[0].accion).toBe('Alta de Nuevo Producto en Catálogo');
  });

  it('cae a rol Admin y modulo Sistema si los campos vienen vacíos', async () => {
    setup({ auditoria: [{ idregistro: 1, usuario: '', accion: 'x', entidad: null, detalle: null }] });
    const logs = await fetchAuditLogsFromSupabase();
    expect(logs?.[0].usuario).toBe('Personal CGAO');
    expect(logs?.[0].rol).toBe('Admin');
    expect(logs?.[0].modulo).toBe('Sistema');
  });

  it('devuelve null si la API falla', async () => {
    setup({ httpError: true });
    expect(await fetchAuditLogsFromSupabase()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// VENTAS
// ---------------------------------------------------------------------------

describe('recordVentaToSupabase', () => {
  it('envía { order } y devuelve idventa + numeroPedido', async () => {
    setup({ ventasSave: { success: true, idventa: 55, numeroPedido: 12 } });

    const result = await recordVentaToSupabase(makeOrder());

    expect(result).toEqual({ idventa: 55, numeroPedido: 12 });
    const body = api.lastCall()?.body as any;
    expect(api.lastCall()?.method).toBe('POST');
    expect(body.order.cliente.documento).toBe('1020304050');
    expect(body.order.items).toHaveLength(1);
  });

  it('devuelve null si la API responde success:false', async () => {
    setup({ httpError: true });
    expect(await recordVentaToSupabase(makeOrder())).toBeNull();
  });

  it('devuelve null ante un fallo de red', async () => {
    setup({ networkError: true });
    expect(await recordVentaToSupabase(makeOrder())).toBeNull();
  });
});

describe('fetchVentasFromSupabase', () => {
  it('mapea todas las ventas a POSOrder', async () => {
    setup({ ventas: [makeDbVenta(), makeDbVenta({ idventa: 102 })] });
    const orders = await fetchVentasFromSupabase();
    expect(orders.map((o) => o.id)).toEqual(['pos-101', 'pos-102']);
  });

  it('devuelve arreglo vacío (no null) si la API falla, para no romper los KPIs', async () => {
    setup({ httpError: true });
    expect(await fetchVentasFromSupabase()).toEqual([]);
  });
});

describe('fetchPOSOrdersFromSupabase', () => {
  it('devuelve null cuando la respuesta no es JSON válido (el endpoint /pedidos no existe)', async () => {
    // El catch-all de Express devuelve el index.html de la SPA para /api/supabase/pedidos,
    // así que `res.json()` revienta y el adaptador cae en null (no borra el estado local).
    setup({ overrides: [{ match: '/api/supabase/pedidos', text: '<!doctype html><html></html>' }] });
    expect(await fetchPOSOrdersFromSupabase()).toBeNull();
  });

  it('devuelve null ante un fallo de red', async () => {
    setup({ networkError: true });
    expect(await fetchPOSOrdersFromSupabase()).toBeNull();
  });
});

describe('updateVentaEstadoToSupabase', () => {
  it('hace PATCH /api/supabase/ventas/{id}/estado con el estado de base de datos', async () => {
    setup();
    expect(await updateVentaEstadoToSupabase(101, 'Listo para Entrega')).toBe(true);
    expect(api.lastCall()?.method).toBe('PATCH');
    expect(api.lastCall()?.path).toBe('/api/supabase/ventas/101/estado');
    expect((api.lastCall()?.body as any).estado).toBe('Listo para Entrega');
  });

  it('devuelve false si el servidor rechaza el cambio de estado', async () => {
    setup({ httpError: true });
    expect(await updateVentaEstadoToSupabase(101, 'Entregado')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DESPACHO
// ---------------------------------------------------------------------------

describe('fetchTicketsDespachoFromSupabase', () => {
  it('mapea las comandas a TicketDespacho', async () => {
    setup({ despacho: [makeDbVenta({ estado: 'En Preparacion' })] });
    const tickets = await fetchTicketsDespachoFromSupabase();

    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe('k-101');
    expect(tickets[0].estado).toBe('preparacion');
    expect(tickets[0].turno).toBe('#42');
    expect(tickets[0].items).toEqual([{ cantidad: 2, nombre: 'Empanada Artesanal', detalle: undefined }]);
  });

  it('clasifica el tipo de ticket según los productos del pedido', async () => {
    const conAlmuerzo = makeDbVenta({
      detalleventa: [{ idproducto: 1, cantidad: 1, precio_unitario: 9000, producto: { nombre: 'Almuerzo Ejecutivo' } }],
    });
    setup({ despacho: [conAlmuerzo] });
    expect((await fetchTicketsDespachoFromSupabase())[0].tipo).toBe('Almuerzo');

    setup({ despacho: [makeDbVenta({ detalleventa: [{ idproducto: 2, cantidad: 1, precio_unitario: 4000, producto: { nombre: 'Jugo de Naranja' } }] })] });
    expect((await fetchTicketsDespachoFromSupabase())[0].tipo).toBe('Bebidas');
  });

  it('devuelve arreglo vacío si la API falla', async () => {
    setup({ httpError: true });
    expect(await fetchTicketsDespachoFromSupabase()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// USUARIOS Y CLIENTES
// ---------------------------------------------------------------------------

describe('fetchUsersFromSupabase', () => {
  it('traduce las tablas admin y personal al directorio de la app', async () => {
    setup({
      usuarios: {
        success: true,
        data: {
          admins: [{ documento: 1098765432, nombre: 'Admin', email: 'admin@sena.edu.co', rol: 'admin', activo: true }],
          personal: [
            { docpersonal: 111, nombre: 'Cajero 1', email: 'c1@sena.edu.co', rol: 'cajero', activo: true },
            { docpersonal: 222, nombre: 'Despachador', email: 'd1@sena.edu.co', rol: 'despachador', activo: false },
            { docpersonal: 333, nombre: 'Auditor', email: 'a1@sena.edu.co', rol: 'auditor', activo: true },
            { docpersonal: 444, nombre: 'Rol raro', email: 'x@sena.edu.co', rol: 'inventado', activo: true },
          ],
        },
      },
    });

    const users = await fetchUsersFromSupabase();

    expect(users).toHaveLength(5);
    expect(users?.[0]).toMatchObject({ id: 'admin-1098765432', rol: 'Admin', activo: true });
    expect(users?.[1]).toMatchObject({ id: 'personal-111', rol: 'Cajero' });
    expect(users?.[2]).toMatchObject({ id: 'personal-222', rol: 'Despachador', activo: false });
    expect(users?.[3]).toMatchObject({ id: 'personal-333', rol: 'Auditor' });
    // Rol desconocido en la BD -> Cajero (rol operativo por defecto, no Cliente).
    expect(users?.[4].rol).toBe('Cajero');
  });

  it('devuelve null si la API falla', async () => {
    setup({ httpError: true });
    expect(await fetchUsersFromSupabase()).toBeNull();
  });
});

describe('fetchClienteFromSupabase', () => {
  it('normaliza el documento a solo dígitos y devuelve nombre + ficha', async () => {
    setup();
    const cliente = await fetchClienteFromSupabase('1.020.304.050');
    expect(cliente).toEqual({ nombre: 'María Pérez', ficha: 2671234 });
    expect(api.lastCall()?.path).toBe('/api/supabase/clientes/1020304050');
  });

  it('devuelve null si el cliente no existe (data:null)', async () => {
    setup({ cliente: { success: true, data: null } });
    expect(await fetchClienteFromSupabase('999')).toBeNull();
  });

  it('devuelve null sin llamar a la API si el documento no tiene dígitos', async () => {
    setup();
    expect(await fetchClienteFromSupabase('abc')).toBeNull();
    expect(api.calls).toHaveLength(0);
  });
});

describe('ensureClienteToSupabase', () => {
  it('crea/garantiza el cliente y devuelve true', async () => {
    setup();
    expect(await ensureClienteToSupabase('1020304050', 'María Pérez', '2671234')).toBe(true);
    const body = api.lastCall()?.body as any;
    expect(api.lastCall()?.method).toBe('POST');
    expect(body).toMatchObject({ documento: 1020304050, nombre: 'María Pérez', ficha: 2671234 });
  });

  it('usa el nombre por defecto cuando el aprendiz no escribe nombre', async () => {
    setup();
    await ensureClienteToSupabase('1020304050', '', '');
    expect((api.lastCall()?.body as any).nombre).toBe('Cliente CGAO');
  });

  it('devuelve false sin llamar a la API si el documento es inválido', async () => {
    setup();
    expect(await ensureClienteToSupabase('sin-numeros', 'X', '1')).toBe(false);
    expect(api.calls).toHaveLength(0);
  });

  it('devuelve false si el servidor responde error', async () => {
    setup({ httpError: true });
    expect(await ensureClienteToSupabase('1020304050', 'X', '1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DIAGNÓSTICO
// ---------------------------------------------------------------------------

describe('checkSupabaseHealth', () => {
  it('reporta conexión healthy con el conteo de productos', async () => {
    setup({ status: { connected: true, url: 'https://x.supabase.co', latencyMs: 42, totalProductos: 12 } });
    const health = await checkSupabaseHealth();
    expect(health).toMatchObject({ connected: true, url: 'https://x.supabase.co', latencyMs: 42, productCount: 12 });
  });

  it('reporta desconexión con el mensaje del backend cuando la BD responde con error', async () => {
    setup({ status: { connected: false, configured: true, error: 'Fallo de red', totalProductos: 0 } });
    const health = await checkSupabaseHealth();
    expect(health.connected).toBe(false);
    expect(health.error).toBe('Fallo de red');
  });

  it('reporta desconexión cuando el backend todavía no está configurado', async () => {
    setup({ status: { connected: false, configured: false, message: 'Esperando configuración' } });
    const health = await checkSupabaseHealth();
    expect(health.connected).toBe(false);
    expect(health.url).toBe('Supabase');
  });

  it('reporta desconexión ante un fallo de red, sin lanzar excepción', async () => {
    setup({ networkError: true });
    const health = await checkSupabaseHealth();
    expect(health.connected).toBe(false);
    expect(health.error).toBeTruthy();
  });
});
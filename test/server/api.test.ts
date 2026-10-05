// @vitest-environment node
/**
 * Tests de integración HTTP contra el backend Express real (`server.ts`).
 *
 * El servidor lo levanta `test/global-setup.ts` UNA sola vez, en modo
 * "in-memory-mock" (sin credenciales de Supabase), y se comparte entre todos los
 * archivos de `test/server/`. Por eso el estado es acumulado: los tests de numeración
 * de turno usan `describe.sequential` y se apoyan en el orden de ejecución.
 */
import { describe, it, expect } from 'vitest';
import { TEST_SERVER_BASE_URL, ADMIN_CREDENTIALS } from '../helpers/server-config';
import { makeDbProducto, makeOrder } from '../helpers/fixtures';

type Json = Record<string, any>;

async function get(path: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${TEST_SERVER_BASE_URL}${path}`);
  return { status: res.status, body: (await res.json()) as Json };
}

async function post(path: string, payload: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${TEST_SERVER_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

async function patch(path: string, payload: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${TEST_SERVER_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

async function del(path: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${TEST_SERVER_BASE_URL}${path}`, { method: 'DELETE' });
  return { status: res.status, body: (await res.json()) as Json };
}

// ---------------------------------------------------------------------------
// HEALTHCHECK
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('reporta el servicio arriba y el modo mock en memoria', async () => {
    const { status, body } = await get('/api/health');

    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      service: 'Cafetería SENA CGAO Backend',
      supabase: false,
      mode: 'in-memory-mock',
    });
  });
});

// ---------------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('autentica al administrador institucional con las credenciales por defecto', async () => {
    const { status, body } = await post('/api/auth/login', {
      identifier: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.rol).toBe('Admin');
    expect(body.email).toBe('admin@sena.edu.co');
  });

  it('acepta el login por número de documento del administrador', async () => {
    const { body } = await post('/api/auth/login', {
      identifier: ADMIN_CREDENTIALS.documento,
      password: ADMIN_CREDENTIALS.password,
    });

    expect(body.success).toBe(true);
    expect(body.rol).toBe('Admin');
  });

  it('rechaza una contraseña incorrecta con 401', async () => {
    const { status, body } = await post('/api/auth/login', {
      identifier: 'admin@sena.edu.co',
      password: 'clave-incorrecta',
    });

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('rechaza un usuario inexistente con 401', async () => {
    const { status, body } = await post('/api/auth/login', {
      identifier: 'nadie@sena.edu.co',
      password: 'cualquiera',
    });

    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('valida que se envíen identificador y contraseña', async () => {
    const sinPass = await post('/api/auth/login', { identifier: 'admin@sena.edu.co' });
    expect(sinPass.status).toBe(400);
    expect(sinPass.body.success).toBe(false);

    const sinId = await post('/api/auth/login', { password: 'admin1234' });
    expect(sinId.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------------

describe('POST /api/supabase/productos', () => {
  it('crea un producto nuevo sin idproducto y le asigna uno válido', async () => {
    const { status, body } = await post('/api/supabase/productos', {
      nombre: 'Producto de Integración',
      precio: 5000,
      stock: 10,
      costo: 3000,
      stock_minimo: 2,
      categoria: 'otros',
      subcategoria: 'General',
      descripcion: 'Creado desde los tests',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Number.isInteger(body.idproducto)).toBe(true);
    expect(body.idproducto).toBeGreaterThan(0);
  });

  it('el id asignado cabe en un INTEGER de PostgreSQL', async () => {
    const { body } = await post('/api/supabase/productos', {
      nombre: 'Producto Límite',
      precio: 1000,
      stock: 1,
      costo: 500,
      stock_minimo: 0,
      categoria: 'otros',
      subcategoria: 'General',
      descripcion: '',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    expect(body.idproducto).toBeLessThanOrEqual(2147483647);
  });

  it('actualiza un producto existente enviando su idproducto', async () => {
    const creado = await post('/api/supabase/productos', {
      nombre: 'Producto a Actualizar',
      precio: 4000,
      stock: 8,
      costo: 2000,
      stock_minimo: 3,
      categoria: 'comida_rapida',
      subcategoria: 'General',
      descripcion: 'v1',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    const actualizado = await post('/api/supabase/productos', {
      idproducto: creado.body.idproducto,
      nombre: 'Producto a Actualizar',
      precio: 4500,
      stock: 6,
      costo: 2000,
      stock_minimo: 3,
      categoria: 'comida_rapida',
      subcategoria: 'General',
      descripcion: 'v2',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    expect(actualizado.body.success).toBe(true);

    const lista = await get('/api/supabase/productos');
    const row = lista.body.data.find(
      (p: Json) => p.idproducto === creado.body.idproducto
    );
    expect(row.precio).toBe(4500);
    expect(row.descripcion).toBe('v2');
  });
});

describe('GET /api/supabase/productos', () => {
  it('devuelve la lista en el contrato { success, data }', async () => {
    const { status, body } = await get('/api/supabase/productos');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('expone los campos que la app necesita mapear', async () => {
    await post('/api/supabase/productos', {
      nombre: 'Producto Para Mapear',
      precio: 7300,
      stock: 40,
      costo: 4100,
      stock_minimo: 9,
      categoria: 'bebidas_frias',
      subcategoria: 'Jugos',
      descripcion: 'Contrato de mapeo',
      imagen: null,
      es_especial: true,
      activo: true,
    });

    const { body } = await get('/api/supabase/productos');
    const row = body.data.find((p: Json) => p.nombre === 'Producto Para Mapear');

    expect(row).toMatchObject({
      precio: 7300,
      stock: 40,
      costo: 4100,
      stock_minimo: 9,
      categoria: 'bebidas_frias',
      subcategoria: 'Jugos',
      es_especial: true,
      activo: true,
    });
  });
});

describe('DELETE /api/supabase/productos/:id', () => {
  it('elimina el producto y ya no aparece en el listado', async () => {
    const creado = await post('/api/supabase/productos', {
      nombre: 'Producto a Eliminar',
      precio: 1000,
      stock: 2,
      costo: 500,
      stock_minimo: 0,
      categoria: 'otros',
      subcategoria: 'General',
      descripcion: '',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    const borrado = await del(`/api/supabase/productos/${creado.body.idproducto}`);
    expect(borrado.status).toBe(200);
    expect(borrado.body.success).toBe(true);

    const lista = await get('/api/supabase/productos');
    expect(lista.body.data.find((p: Json) => p.idproducto === creado.body.idproducto)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TURNOS DIARIOS (orden dependiente: el contador es compartido en el mock)
// ---------------------------------------------------------------------------

describe('numeración de turno diario', () => {
  it('Caso A: /ventas/turno-actual responde 200 y NO se confunde con el :id de Express', async () => {
    const { status, body } = await get('/api/supabase/ventas/turno-actual');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.numero).toBe('number');
    expect(body.numero).toBeGreaterThanOrEqual(1);
  });

  it('Caso B: el turno avanza después de registrar una venta', async () => {
    const antes = await get('/api/supabase/ventas/turno-actual');

    const creada = await post('/api/supabase/ventas', { order: makeOrder() });
    expect(creada.status).toBe(200);
    expect(creada.body.success).toBe(true);
    expect(creada.body.idventa).toBeGreaterThan(0);

    const despues = await get('/api/supabase/ventas/turno-actual');
    expect(despues.body.numero).toBe(antes.body.numero + 1);
  });

  it('Caso C: devuelve JSON (no HTML) para /ventas/turno-actual', async () => {
    const res = await fetch(`${TEST_SERVER_BASE_URL}/api/supabase/ventas/turno-actual`);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect((await res.json()).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VENTAS Y DESPACHO
// ---------------------------------------------------------------------------

describe('POST /api/supabase/ventas y despacho', () => {
  it('persiste la venta y la devuelve en el listado con su detalle', async () => {
    const creada = await post('/api/supabase/ventas', { order: makeOrder() });

    const listado = await get('/api/supabase/ventas');
    expect(listado.body.success).toBe(true);

    const row = listado.body.data.find((v: Json) => v.idventa === creada.body.idventa);
    expect(row).toBeDefined();
    expect(Array.isArray(row.detalleventa)).toBe(true);
    expect(row.detalleventa.length).toBeGreaterThan(0);
  });

  it('rechaza una venta sin el objeto `order` ni `venta` con 400', async () => {
    const { status, body } = await post('/api/supabase/ventas', { basura: true });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/falta el objeto venta u order/i);
  });

  it('acepta un pedido con items vacíos (el mock no valida el detalle)', async () => {
    // Documenta el comportamiento real del modo autónomo: solo se valida el
    // envoltorio `order`/`venta`, no el contenido de `items`.
    const { status, body } = await post('/api/supabase/ventas', {
      order: { ...makeOrder(), items: [] },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('expone las ventas en el endpoint de despacho', async () => {
    const { status, body } = await get('/api/supabase/despacho');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('PATCH /api/supabase/ventas/:id/estado', () => {
  it('actualiza el estado de una venta existente', async () => {
    const creada = await post('/api/supabase/ventas', { order: makeOrder() });
    const id = creada.body.idventa;

    const actualizada = await patch(`/api/supabase/ventas/${id}/estado`, {
      estado: 'En Preparacion',
    });

    expect(actualizada.status).toBe(200);
    expect(actualizada.body.success).toBe(true);

    const listado = await get('/api/supabase/ventas');
    const row = listado.body.data.find((v: Json) => v.idventa === id);
    expect(row.estado).toBe('En Preparacion');
  });

  it('exige el campo `estado` y responde 400 si falta', async () => {
    const creada = await post('/api/supabase/ventas', { order: makeOrder() });
    const { status, body } = await patch(`/api/supabase/ventas/${creada.body.idventa}/estado`, {});

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/falta el nuevo estado/i);
  });

  it('rechaza un id de venta no numérico con 400', async () => {
    const { status, body } = await patch('/api/supabase/ventas/abc/estado', { estado: 'Entregado' });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/id de venta inválido/i);
  });

  it('acepta cualquier texto de estado (el backend no valida el catálogo)', async () => {
    // Comportamiento conocido: la validación del catálogo de estados depende de la
    // columna ENUM de PostgreSQL, no del backend.
    const creada = await post('/api/supabase/ventas', { order: makeOrder() });
    const { status, body } = await patch(`/api/supabase/ventas/${creada.body.idventa}/estado`, {
      estado: 'Estado Inventado',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('responde success:true aunque la venta no exista en el mock', async () => {
    // Gap conocido: en modo autónomo no se verifica la existencia de la venta.
    const { status, body } = await patch('/api/supabase/ventas/999999/estado', {
      estado: 'Entregado',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BAJAS
// ---------------------------------------------------------------------------

describe('POST /api/supabase/bajas', () => {
  it('registra la baja con su id, cantidad, motivo y categoría', async () => {
    const producto = await post('/api/supabase/productos', {
      nombre: 'Producto para Merma',
      precio: 2000,
      stock: 20,
      costo: 1000,
      stock_minimo: 5,
      categoria: 'comida_rapida',
      subcategoria: 'General',
      descripcion: '',
      imagen: null,
      es_especial: false,
      activo: true,
    });
    const id = producto.body.idproducto;

    const baja = await post('/api/supabase/bajas', {
      idproducto: id,
      cantidad: 3,
      motivo: 'Merma de prueba',
      categoria: 'Mermas Cocina',
    });

    expect(baja.status).toBe(200);
    expect(baja.body.success).toBe(true);

    const listado = await get('/api/supabase/bajas');
    const row = listado.body.data.find(
      (b: Json) => b.motivo === 'Merma de prueba' && b.idproducto === id
    );
    expect(row).toBeDefined();
    expect(row.cantidad).toBe(3);
    expect(row.categoria).toBe('Mermas Cocina');
    expect(row.idbaja).toBeGreaterThan(0);
  });

  it('NO descuenta el stock del producto en modo autónomo', async () => {
    // Gap conocido: el descuento de inventario por merma depende del trigger de
    // PostgreSQL; el mock en memoria solo registra la baja.
    const producto = await post('/api/supabase/productos', {
      nombre: 'Producto Merma Sin Descuento',
      precio: 2000,
      stock: 20,
      costo: 1000,
      stock_minimo: 5,
      categoria: 'comida_rapida',
      subcategoria: 'General',
      descripcion: '',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    await post('/api/supabase/bajas', {
      idproducto: producto.body.idproducto,
      cantidad: 3,
      motivo: 'Merma sin descuento',
      categoria: 'Mermas Cocina',
    });

    const listado = await get('/api/supabase/productos');
    const row = listado.body.data.find((p: Json) => p.idproducto === producto.body.idproducto);
    expect(row.stock).toBe(20);
  });

  it('devuelve las bajas con la relación del producto', async () => {
    const { status, body } = await get('/api/supabase/bajas');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------

describe('clientes', () => {
  it('crea un cliente y luego lo consulta por documento', async () => {
    const documento = '1030305060';

    const creado = await post('/api/supabase/clientes', {
      documento: Number(documento),
      nombre: 'Cliente de Integración',
      ficha: 8765432,
    });
    expect(creado.status).toBe(200);
    expect(creado.body.success).toBe(true);

    const consultado = await get(`/api/supabase/clientes/${documento}`);
    expect(consultado.status).toBe(200);
    expect(consultado.body.success).toBe(true);
    expect(consultado.body.data.nombre).toBe('Cliente de Integración');
    expect(consultado.body.data.ficha).toBe(8765432);
  });

  it('es un upsert: el mismo documento actualiza nombre y ficha', async () => {
    const documento = 1030305060;

    await post('/api/supabase/clientes', { documento, nombre: 'Otro nombre', ficha: 1111111 });
    const consultado = await get(`/api/supabase/clientes/${documento}`);

    expect(consultado.body.data.nombre).toBe('Otro nombre');
    expect(consultado.body.data.ficha).toBe(1111111);
  });

  it('devuelve { success:true, data:null } para un cliente inexistente', async () => {
    // El kiosk usa `data === null` para saber que debe crear el registro.
    const { status, body } = await get('/api/supabase/clientes/9999999999');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
  });

  it('rechaza un documento no numérico con 400', async () => {
    const { status, body } = await post('/api/supabase/clientes', {
      documento: 'no-es-un-documento',
      nombre: 'X',
      ficha: '1',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('normaliza el documento con puntos y guiones', async () => {
    const { status, body } = await post('/api/supabase/clientes', {
      documento: '1.020.999.888-7',
      nombre: 'Cliente Normalizado',
      ficha: '2.671.234',
    });

    expect(status).toBe(200);

    const consultado = await get('/api/supabase/clientes/10209998887');
    expect(consultado.body.data.nombre).toBe('Cliente Normalizado');
    expect(consultado.body.data.ficha).toBe(2671234);
  });
});

// ---------------------------------------------------------------------------
// AUDITORÍA
// ---------------------------------------------------------------------------

describe('auditoría', () => {
  it('registra una entrada de bitácora y la devuelve en el listado', async () => {
    const nuevo = await post('/api/supabase/auditoria', {
      usuario: 'Admin Prueba (Admin)',
      accion: 'Prueba de auditoría',
      entidad: 'Inventario',
      detalle: 'Escritura desde los tests de integración',
      timestamp: new Date().toISOString(),
    });

    expect(nuevo.status).toBe(200);
    expect(nuevo.body.success).toBe(true);

    const listado = await get('/api/supabase/auditoria');
    expect(listado.body.success).toBe(true);
    expect(
      listado.body.data.find((a: Json) => a.accion === 'Prueba de auditoría')
    ).toBeDefined();
  });

  it('acepta una entrada sin campo usuario (el mock no lo exige)', async () => {
    // Gap conocido: solo la columna NOT NULL de PostgreSQL garantiza el `usuario`.
    const { status, body } = await post('/api/supabase/auditoria', {
      accion: 'Sin usuario (mock)',
      entidad: 'Sistema',
      detalle: 'x',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------

describe('POST /api/supabase/usuarios', () => {
  it('registra a un cliente aprendiz', async () => {
    const { status, body } = await post('/api/supabase/usuarios', {
      user: {
        documento: '1098765001',
        nombre: 'Aprendiz Prueba',
        email: 'aprendiz.prueba@sena.edu.co',
        rol: 'Cliente',
        ficha: '2671234',
      },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('registra a un cajero', async () => {
    const { body } = await post('/api/supabase/usuarios', {
      user: {
        documento: '1098765002',
        nombre: 'Cajero Prueba',
        email: 'cajero.prueba@sena.edu.co',
        rol: 'Cajero',
      },
    });

    expect(body.success).toBe(true);
  });

  it('registra a un despachador', async () => {
    const { body } = await post('/api/supabase/usuarios', {
      user: {
        documento: '1098765003',
        nombre: 'Despachador Prueba',
        email: 'despacho.prueba@sena.edu.co',
        rol: 'Despachador',
      },
    });

    expect(body.success).toBe(true);
  });

  it('registra a un auditor', async () => {
    const { body } = await post('/api/supabase/usuarios', {
      user: {
        documento: '1098765004',
        nombre: 'Auditor Prueba',
        email: 'auditor.prueba@sena.edu.co',
        rol: 'Auditor',
      },
    });

    expect(body.success).toBe(true);
  });

  it('el usuario creado aparece en GET /api/supabase/usuarios', async () => {
    const { status, body } = await get('/api/supabase/usuarios');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.admins)).toBe(true);
    expect(Array.isArray(body.data.personal)).toBe(true);

    const documentos = [
      ...body.data.admins.map((a: Json) => String(a.documento)),
      ...body.data.personal.map((p: Json) => String(p.docpersonal)),
    ];
    expect(documentos).toContain('1098765002');
  });

  it('nunca expone el hash de la contraseña en el listado', async () => {
    const { body } = await get('/api/supabase/usuarios');
    for (const admin of body.data.admins) {
      expect(admin.clave).toBeUndefined();
    }
  });

  it('rechaza un usuario sin documento', async () => {
    const { status, body } = await post('/api/supabase/usuarios', {
      user: { nombre: 'Sin documento', email: 'x@sena.edu.co', rol: 'Cajero' },
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// STATUS
// ---------------------------------------------------------------------------

describe('GET /api/supabase/status', () => {
  it('informa que Supabase no está configurado sin lanzar error', async () => {
    const { status, body } = await get('/api/supabase/status');

    expect(status).toBe(200);
    expect(body.connected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CONTRATO COMPARTIDO CON LA APP
// ---------------------------------------------------------------------------

describe('contrato servidor ↔ adaptadores de la app', () => {
  it('las filas de venta traen los campos que usa mapDbVentaToPOSOrder', async () => {
    await post('/api/supabase/ventas', { order: makeOrder() });
    const { body } = await get('/api/supabase/ventas');

    const row = body.data[0];
    expect(row).toHaveProperty('idventa');
    expect(row).toHaveProperty('estado');
    expect(row).toHaveProperty('metodo_pago');
    expect(row).toHaveProperty('numero_pedido_diario');
    expect(row).toHaveProperty('detalleventa');
    expect(Array.isArray(row.detalleventa)).toBe(true);
  });

  it('las filas de producto traen los campos que usa mapDbProductoToItem', async () => {
    await post('/api/supabase/productos', {
      nombre: 'Producto de Contrato',
      precio: 1000,
      stock: 3,
      costo: 400,
      stock_minimo: 1,
      categoria: 'reposteria',
      subcategoria: 'Postres',
      descripcion: 'contrato',
      imagen: null,
      es_especial: false,
      activo: true,
    });

    const { body } = await get('/api/supabase/productos');
    const row = body.data.find((p: Json) => p.nombre === 'Producto de Contrato');

    for (const campo of [
      'idproducto',
      'nombre',
      'precio',
      'stock',
      'costo',
      'stock_minimo',
      'categoria',
      'subcategoria',
      'descripcion',
      'imagen',
      'es_especial',
      'activo',
    ]) {
      expect(row).toHaveProperty(campo);
    }
  });

  it('el fixture makeDbProducto sigue siendo compatible con el contrato', () => {
    const fixture = makeDbProducto();
    for (const campo of ['idproducto', 'nombre', 'precio', 'stock', 'costo', 'activo']) {
      expect(fixture).toHaveProperty(campo);
    }
  });
});
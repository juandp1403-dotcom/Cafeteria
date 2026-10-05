// @vitest-environment node
process.env.SUPABASE_URL = '';
process.env.VITE_SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SUPABASE_SECRET_KEY = '';
process.env.SUPABASE_PUBLISHABLE_KEY = '';
process.env.VITE_SUPABASE_ANON_KEY = '';
process.env.PORT = '3957';
process.env.NODE_ENV = 'production';

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = `http://127.0.0.1:${process.env.PORT}`;

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // servidor aún no está escuchando
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor Express no levantó a tiempo en los tests.');
}

beforeAll(async () => {
  // Importa server.ts (arranca el listener) — sin credenciales Supabase => modo mock in-memory
  await import('./server.ts');
  await waitForServer();
}, 30000);

const minimalOrder = {
  id: 'ord-test-1',
  numeroTurno: '#001',
  fecha: '17/09/2026',
  hora: '10:30',
  cliente: { nombre: 'María Pérez', documento: '1020304050', ficha: '2671234', programa: 'ADSO' },
  items: [{ nombre: 'Empanada Artesanal', descripcion: '', cantidad: 1, precioUnitario: 5000, total: 5000 }],
  metodoPago: 'Efectivo',
  subtotal: 5000,
  descuento: 0,
  total: 5000,
  estado: 'pendiente_pago',
  faseActual: 1,
  idVenta: '#VTA-999',
  mesaKiosko: 'Kiosko A-01',
};

describe('getNextNumeroPedidoDiario vía GET /api/supabase/ventas/turno-actual', () => {
  it('Caso A: primer pedido del día devuelve turno 1', async () => {
    const res = await request(BASE_URL).get('/api/supabase/ventas/turno-actual');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.numero).toBe(1);
  });

  it('Caso B: después de insertar una venta el siguiente turno es 2', async () => {
    const resPost = await request(BASE_URL).post('/api/supabase/ventas').send({ order: minimalOrder });
    expect(resPost.status).toBe(200);
    expect(resPost.body.success).toBe(true);

    const res = await request(BASE_URL).get('/api/supabase/ventas/turno-actual');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.numero).toBe(2);
  });

  it('Caso C: el endpoint responde 200 y Express no lo confunde con un parámetro :id', async () => {
    const res = await request(BASE_URL).get('/api/supabase/ventas/turno-actual');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/supabase/productos — producto nuevo sin idproducto', () => {
  it('Caso A: responde 200 con success true (el mock asigna el id)', async () => {
    const res = await request(BASE_URL)
      .post('/api/supabase/productos')
      .send({
        nombre: 'Test',
        precio: 5000,
        stock: 10,
        costo: 3000,
        stock_minimo: 2,
        categoria: 'otros',
        subcategoria: 'General',
        descripcion: 'Test',
        imagen: null,
        es_especial: false,
        activo: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Caso B: GET /api/supabase/productos devuelve el producto con idproducto válido', async () => {
    const res = await request(BASE_URL).get('/api/supabase/productos');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const created = res.body.data.find((p: any) => p.nombre === 'Test');
    expect(created).toBeDefined();
    expect(created.idproducto).toBeDefined();
    expect(created.idproducto).toBeLessThanOrEqual(2147483647);
  });
});

describe('POST /api/supabase/usuarios — gestión y persistencia de usuarios', () => {
  it('registra correctamente un cliente con documento, nombre y ficha', async () => {
    const res = await request(BASE_URL)
      .post('/api/supabase/usuarios')
      .send({
        user: {
          documento: '1098765001',
          nombre: 'Aprendiz Prueba',
          email: 'aprendiz@sena.edu.co',
          rol: 'Cliente',
          ficha: '2671234',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('registra correctamente un usuario con rol operativo (personal)', async () => {
    const res = await request(BASE_URL)
      .post('/api/supabase/usuarios')
      .send({
        user: {
          documento: '1098765002',
          nombre: 'Cajero Prueba',
          email: 'cajero.test@sena.edu.co',
          rol: 'Cajero',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('registra correctamente un usuario admin', async () => {
    const res = await request(BASE_URL)
      .post('/api/supabase/usuarios')
      .send({
        user: {
          documento: '1098765003',
          nombre: 'Admin Prueba',
          email: 'admin.test@sena.edu.co',
          rol: 'Admin',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
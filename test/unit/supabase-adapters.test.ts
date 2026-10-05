// @vitest-environment jsdom
/**
 * Tests unitarios de los adaptadores PUROS de `src/lib/supabase.ts`.
 *
 * Cubre el mapeo entre el esquema PostgreSQL (Supabase) y los tipos de la app,
 * que es la capa donde antes se perdían IDs de producto (bug histórico de
 * `idproducto` fuera del rango INTEGER) y donde se calculan los estados.
 */
import { describe, it, expect } from 'vitest';
import {
  humanizarCategoriaKey,
  mapBajaToDbBajaInventario,
  mapDbProductoToItem,
  mapDbVentaToPOSOrder,
  mapItemToDbProducto,
  toDbRol,
} from '../../src/lib/supabase';
import { makeBaja, makeDbProducto, makeDbVenta, makeProduct } from '../helpers/fixtures';

describe('toDbRol — normalización de roles de la app al esquema', () => {
  it.each([
    ['Admin', 'admin'],
    ['admin', 'admin'],
    ['ADMIN', 'admin'],
    ['  Cajero  ', 'cajero'],
    ['Despachador', 'despachador'],
    ['Auditor', 'auditor'],
    ['Cliente', 'cliente'],
  ])('mapea %s → %s', (entrada, esperado) => {
    expect(toDbRol(entrada)).toBe(esperado);
  });

  it('cae a "cliente" para roles desconocidos', () => {
    expect(toDbRol('SuperAdministrator')).toBe('cliente');
    expect(toDbRol('')).toBe('cliente');
  });

  it('cae a "cliente" cuando no se recibe rol', () => {
    expect(toDbRol()).toBe('cliente');
    expect(toDbRol(undefined)).toBe('cliente');
  });

  it('nunca devuelve un rol fuera del union type del esquema', () => {
    const validos = ['admin', 'cajero', 'despachador', 'auditor', 'cliente'];
    for (const rol of ['Admin', 'Cajero', 'Despachador', 'Auditor', 'Cliente', 'x', '']) {
      expect(validos).toContain(toDbRol(rol));
    }
  });
});

describe('humanizarCategoriaKey — etiquetas legibles de categoría', () => {
  it.each([
    ['comida_rapida', 'Comida Rapida'],
    ['bebidas_frias', 'Bebidas Frias'],
    ['cafe_calientes', 'Cafe Calientes'],
    ['combos_sena', 'Combos Sena'],
    ['reposteria', 'Reposteria'],
    ['otros', 'Otros'],
    ['panaderia_lacteos', 'Panaderia Lacteos'],
  ])('convierte %s → %s', (entrada, esperado) => {
    expect(humanizarCategoriaKey(entrada)).toBe(esperado);
  });

  it('deja intacta una cadena sin separadores', () => {
    expect(humanizarCategoriaKey('postres')).toBe('Postres');
  });
});

describe('mapDbProductoToItem — fila SQL → ProductItem', () => {
  it('mapea todos los campos de la ficha de producto', () => {
    const item = mapDbProductoToItem(makeDbProducto());

    expect(item).toMatchObject({
      id: 'prod-7',
      nombre: 'Empanada Artesanal',
      descripcion: 'Empanada de prueba',
      precio: 5000,
      costo: 3000,
      stock: 10,
      alertaStock: 5,
      categoria: 'comida_rapida',
      categoriaLabel: 'Comida Rápida',
      subcategoria: 'General',
      tag: 'CGAO VÉLEZ',
    });
  });

  it('usa la etiqueta institucional de las 6 categorías conocidas', () => {
    const etiquetas: Record<string, string> = {
      comida_rapida: 'Comida Rápida',
      bebidas_frias: 'Bebidas Frías',
      cafe_calientes: 'Café & Calientes',
      combos_sena: 'Combos SENA',
      reposteria: 'Repostería',
      otros: 'Otros Insumos',
    };
    for (const [categoria, etiqueta] of Object.entries(etiquetas)) {
      expect(mapDbProductoToItem(makeDbProducto({ categoria })).categoriaLabel).toBe(etiqueta);
    }
  });

  it('deriva la etiqueta con humanizarCategoriaKey para categorías nuevas', () => {
    expect(mapDbProductoToItem(makeDbProducto({ categoria: 'panaderia_nueva' })).categoriaLabel).toBe(
      'Panaderia Nueva'
    );
  });

  it('cae a la categoría "otros" cuando la fila viene sin categoría', () => {
    const item = mapDbProductoToItem(makeDbProducto({ categoria: null }));
    expect(item.categoria).toBe('otros');
    expect(item.categoriaLabel).toBe('Otros Insumos');
  });

  it('cae a "General" cuando la subcategoría es nula', () => {
    expect(mapDbProductoToItem(makeDbProducto({ subcategoria: null })).subcategoria).toBe('General');
  });

  it('marca como agotado cuando el stock es 0', () => {
    expect(mapDbProductoToItem(makeDbProducto({ stock: 0 })).agotado).toBe(true);
  });

  it('marca como agotado cuando el producto está inactivo aunque tenga stock', () => {
    const item = mapDbProductoToItem(makeDbProducto({ stock: 25, activo: false }));
    expect(item.agotado).toBe(true);
  });

  it('no marca agotado un producto activo con existencias', () => {
    expect(mapDbProductoToItem(makeDbProducto({ stock: 3, activo: true })).agotado).toBe(false);
  });

  it('asigna la etiqueta ESPECIAL CHEF cuando es_especial es true', () => {
    expect(mapDbProductoToItem(makeDbProducto({ es_especial: true })).tag).toBe('ESPECIAL CHEF');
  });

  it('asigna una imagen por defecto cuando la fila no trae imagen', () => {
    const item = mapDbProductoToItem(makeDbProducto({ imagen: null }));
    expect(item.imagen).toContain('http');
  });
});

describe('mapItemToDbProducto — ProductItem → fila SQL (upsert)', () => {
  it('NO incluye idproducto para un producto NUEVO (id tipo timestamp)', () => {
    const result = mapItemToDbProducto(makeProduct({ id: `prod-${Date.now()}` }));
    expect(result.idproducto).toBeUndefined();
    expect('idproducto' in result).toBe(false);
  });

  it('incluye idproducto para un producto EXISTENTE con id serial válido', () => {
    expect(mapItemToDbProducto(makeProduct({ id: 'prod-7' })).idproducto).toBe(7);
  });

  it('incluye idproducto en el límite exacto del tipo INTEGER (2147483647)', () => {
    expect(mapItemToDbProducto(makeProduct({ id: 'prod-2147483647' })).idproducto).toBe(2147483647);
  });

  it('NO incluye idproducto por encima del límite INTEGER (2147483648)', () => {
    expect(mapItemToDbProducto(makeProduct({ id: 'prod-2147483648' })).idproducto).toBeUndefined();
  });

  it('NO incluye idproducto cuando el id no es numérico', () => {
    expect(mapItemToDbProducto(makeProduct({ id: 'prod-abc' })).idproducto).toBeUndefined();
  });

  it('mapea stock_minimo desde alertaStock', () => {
    expect(mapItemToDbProducto(makeProduct({ alertaStock: 12 })).stock_minimo).toBe(12);
  });

  it('deriva es_especial del texto de la etiqueta promocional', () => {
    expect(mapItemToDbProducto(makeProduct({ tag: 'ESPECIAL CHEF' })).es_especial).toBe(true);
    expect(mapItemToDbProducto(makeProduct({ tag: 'CGAO VÉLEZ' })).es_especial).toBe(false);
  });

  it('deriva activo = !agotado', () => {
    expect(mapItemToDbProducto(makeProduct({ agotado: true })).activo).toBe(false);
    expect(mapItemToDbProducto(makeProduct({ agotado: false })).activo).toBe(true);
    expect(mapItemToDbProducto(makeProduct({})).activo).toBe(true);
  });

  it('conserva nombre, precio, costo, categoría y descripción', () => {
    const result = mapItemToDbProducto(makeProduct());
    expect(result.nombre).toBe('Empanada Artesanal');
    expect(result.precio).toBe(5000);
    expect(result.costo).toBe(3000);
    expect(result.categoria).toBe('comida_rapida');
    expect(result.subcategoria).toBe('General');
    expect(result.descripcion).toBe('Empanada de carne con ají suave.');
  });

  it('hace round-trip: DB → app → DB conserva precio y umbral de stock', () => {
    const original = makeDbProducto({ precio: 7300, stock_minimo: 9, stock: 40 });
    const roundTrip = mapItemToDbProducto(mapDbProductoToItem(original));
    expect(roundTrip.precio).toBe(7300);
    expect(roundTrip.stock_minimo).toBe(9);
    expect(roundTrip.stock).toBe(40);
    expect(roundTrip.idproducto).toBe(7);
  });
});

describe('mapBajaToDbBajaInventario — BajaItem → fila bajainventario', () => {
  it('mapea el producto, la cantidad, el motivo y la categoría', () => {
    const baja = makeBaja();
    const row = mapBajaToDbBajaInventario(baja);

    expect(row.idproducto).toBe(7);
    expect(row.cantidad).toBe(3);
    expect(row.motivo).toBe(baja.motivo);
    expect(row.categoria).toBe(baja.categoria);
    expect(row.usuario_tipo).toBe(baja.responsable);
  });

  it('usa idproducto 0 cuando el productoId no es numérico', () => {
    expect(mapBajaToDbBajaInventario(makeBaja({ productoId: 'prod-nuevo' })).idproducto).toBe(0);
  });

  it('genera una fecha ISO válida de descargue', () => {
    const row = mapBajaToDbBajaInventario(makeBaja());
    expect(typeof row.fecha).toBe('string');
    expect(Number.isNaN(Date.parse(row.fecha as string))).toBe(false);
  });

  it('deja usuario_documento en null (se resuelve en el servidor)', () => {
    expect(mapBajaToDbBajaInventario(makeBaja()).usuario_documento).toBeNull();
  });
});

describe('mapDbVentaToPOSOrder — fila venta → POSOrder', () => {
  it('mapea cabecera y genera el id estable pos-{idventa}', () => {
    const pos = mapDbVentaToPOSOrder(makeDbVenta());

    expect(pos.id).toBe('pos-101');
    expect(pos.idventaDb).toBe(101);
    expect(pos.estadoDb).toBe('Pagado');
    expect(pos.clienteNombre).toBe('María Pérez');
    expect(pos.ficha).toBe('2671234');
    expect(pos.total).toBe(23000);
    expect(pos.metodoPago).toBe('Efectivo');
  });

  it('usa el número de pedido diario como número de turno', () => {
    expect(mapDbVentaToPOSOrder(makeDbVenta({ numero_pedido_diario: 7 })).numeroTurno).toBe('#7');
  });

  it('cae a #VTA-{id} cuando la venta no tiene número de pedido diario', () => {
    expect(mapDbVentaToPOSOrder(makeDbVenta({ numero_pedido_diario: null })).numeroTurno).toBe(
      '#VTA-101'
    );
  });

  it('proyecta detalleventa a los items de la orden', () => {
    const pos = mapDbVentaToPOSOrder(makeDbVenta());
    expect(pos.items).toEqual([{ cantidad: 2, nombre: 'Empanada Artesanal', precio: 5000 }]);
  });

  it('sustituye por una consumición genérica cuando la venta no tiene detalle', () => {
    const pos = mapDbVentaToPOSOrder(makeDbVenta({ detalleventa: [] }));
    expect(pos.items).toEqual([{ cantidad: 1, nombre: 'Consumición CGAO', precio: 23000 }]);
  });

  it.each([
    ['Pendiente de Pago', 'pendiente'],
    ['Pagado', 'cobrado'],
    ['En Preparacion', 'cobrado'],
    ['Listo para Entrega', 'cobrado'],
    ['Entregado', 'cobrado'],
    ['Cancelado', 'anulado'],
    ['Estado Inventado', 'pendiente'],
  ])('mapea el estado de BD %s → %s para el POS', (estadoDb, esperado) => {
    expect(mapDbVentaToPOSOrder(makeDbVenta({ estado: estadoDb })).estado).toBe(esperado);
  });

  it('mapea el método de pago y cae a Efectivo si es desconocido', () => {
    expect(mapDbVentaToPOSOrder(makeDbVenta({ metodo_pago: 'Transferencia' })).metodoPago).toBe(
      'Transferencia'
    );
    expect(mapDbVentaToPOSOrder(makeDbVenta({ metodo_pago: 'PSE' })).metodoPago).toBe('Efectivo');
  });

  it('clasifica una venta del día actual como "Hoy"', () => {
    const now = Date.parse('2026-09-17T15:00:00Z');
    const pos = mapDbVentaToPOSOrder(makeDbVenta({ created_at: '2026-09-17T12:00:00Z' }), now);
    expect(pos.fecha).toBe('Hoy');
  });

  it('calcula los minutos de espera transcurridos', () => {
    const now = Date.parse('2026-09-17T12:20:00Z');
    const pos = mapDbVentaToPOSOrder(makeDbVenta({ created_at: '2026-09-17T12:00:00Z' }), now);
    expect(pos.tiempoRelativo).toBe('hace 20 min');
  });

  it('marca "Recién recibido" cuando han pasado 0 minutos', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const pos = mapDbVentaToPOSOrder(makeDbVenta({ created_at: '2026-09-17T12:00:00Z' }), now);
    expect(pos.tiempoRelativo).toBe('Recién recibido');
  });

  it('nunca devuelve minutos negativos si la venta es del futuro (reloj desfasado)', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const pos = mapDbVentaToPOSOrder(makeDbVenta({ created_at: '2026-09-17T13:00:00Z' }), now);
    expect(pos.tiempoRelativo).toBe('Recién recibido');
  });

  it('usa fechaventa cuando la fila no trae created_at', () => {
    const pos = mapDbVentaToPOSOrder(
      makeDbVenta({ created_at: undefined, fechaventa: new Date().toISOString() })
    );
    expect(Number.isFinite(pos.timestamp)).toBe(true);
  });

  it('cae a "Aprendiz CGAO" cuando la venta no tiene cliente relacionado', () => {
    expect(mapDbVentaToPOSOrder(makeDbVenta({ cliente: null })).clienteNombre).toBe('Aprendiz CGAO');
  });
});
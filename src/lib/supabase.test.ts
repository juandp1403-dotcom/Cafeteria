import { describe, it, expect } from 'vitest';
import { mapItemToDbProducto } from './supabase';
import type { ProductItem } from '../types';

function makeItem(id: string): ProductItem {
  return {
    id,
    nombre: 'Empanada Artesanal',
    descripcion: 'Descripción de prueba',
    categoria: 'comida_rapida',
    categoriaLabel: 'Comida Rápida',
    subcategoria: 'General',
    precio: 5000,
    costo: 3000,
    stock: 10,
    alertaStock: 5,
    imagen: 'https://example.com/empanada.jpg',
    calorias: 250,
    tag: 'CGAO VÉLEZ',
  };
}

describe('mapItemToDbProducto', () => {
  it('Caso A: producto NUEVO con id timestamp NO incluye idproducto', () => {
    const item = makeItem(`prod-${Date.now()}`);
    const result = mapItemToDbProducto(item);
    expect(result.idproducto).toBeUndefined();
  });

  it('Caso B: producto EXISTENTE con id serial válido incluye idproducto', () => {
    const result = mapItemToDbProducto(makeItem('prod-7'));
    expect(result.idproducto).toBe(7);
  });

  it('Caso C: límite exacto del tipo INTEGER (2147483647) SÍ incluye idproducto', () => {
    const result = mapItemToDbProducto(makeItem('prod-2147483647'));
    expect(result.idproducto).toBe(2147483647);
  });

  it('Caso D: valor por encima del límite (2147483648) NO incluye idproducto', () => {
    const result = mapItemToDbProducto(makeItem('prod-2147483648'));
    expect(result.idproducto).toBeUndefined();
  });
});
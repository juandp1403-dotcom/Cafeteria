// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import App from './App';
import type { DbProducto } from './lib/supabase';

const mockProduct: DbProducto = {
  idproducto: 7,
  nombre: 'Empanada Artesanal',
  precio: 5000,
  stock: 10,
  imagen: 'https://example.com/empanada.jpg',
  stock_minimo: 5,
  costo: 3000,
  categoria: 'comida_rapida',
  subcategoria: 'General',
  descripcion: 'Empanada de prueba para el test E2E.',
  es_especial: false,
  especial_hasta: null,
  activo: true,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();

    if (url.includes('/api/supabase/ventas/turno-actual') && method === 'GET') {
      return { ok: true, status: 200, json: async () => ({ success: true, numero: 5 }) };
    }
    if (url.includes('/api/supabase/ventas') && method === 'POST') {
      return { ok: true, status: 200, json: async () => ({ success: true, idventa: 99, numeroPedido: 5 }) };
    }
    if (url.includes('/api/supabase/productos')) {
      return { ok: true, status: 200, json: async () => ({ success: true, data: [mockProduct] }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('handleConfirmOrder — numeroTurno real (desde el servidor)', () => {
  it('muestra #005 tras confirmar el pedido y NO muestra #042', async () => {
    render(<App />);
    const user = userEvent.setup();

    // 1. Pantalla de identificación
    expect(await screen.findByText('Identificación de Aprendiz')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Ej: 1020304050'), '1020304050');
    await user.type(screen.getByPlaceholderText('Ej: Juan Carlos Pérez Gómez'), 'María Pérez');
    await user.type(screen.getByPlaceholderText('Ej: 2671234'), '2671234');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Ingresar al Catálogo/i }));

    // 2. Catálogo: agregar producto y confirmar
    expect(await screen.findByText('Catálogo de Alimentos CGAO')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    // 3. MiTurno: turno #005 formateado con padStart(3,'0')
    expect(await screen.findByText('#005')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('#042');
  });
});
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MiTurnoScreen } from './MiTurnoScreen';
import type { Order } from '../types';

const order: Order = {
  id: 'ord-test',
  numeroTurno: '#001',
  fecha: '17/09/2026',
  hora: '10:30',
  cliente: { nombre: 'María Pérez', documento: '1020304050', ficha: '2671234', programa: 'ADSO' },
  items: [{ nombre: 'Empanada Artesanal', cantidad: 1, precioUnitario: 5000, total: 5000 }],
  metodoPago: 'Efectivo',
  subtotal: 5000,
  descuento: 0,
  total: 5000,
  estado: 'pendiente_pago',
  faseActual: 1,
  idVenta: '#VTA-99',
  mesaKiosko: 'Kiosko A-01',
};

describe('MiTurnoScreen — sin QR ni código de barras', () => {
  it('no renderiza el bloque QR, el código de barras ni el SVG estático', () => {
    const { container } = render(
      <MiTurnoScreen
        order={order}
        onNewOrder={() => {}}
        onOpenReceipt={() => {}}
        onAdvanceState={() => {}}
      />
    );

    expect(screen.queryByText('ESCANEO EN VENTANILLA DE DESPACHO')).not.toBeInTheDocument();
    expect(screen.queryByText('9842-1042-SENA')).not.toBeInTheDocument();

    const hasStaticQrSvg = Array.from(container.querySelectorAll('svg')).some((svg) =>
      Array.from(svg.querySelectorAll('rect')).some((rect) => rect.getAttribute('fill') === '#000000')
    );
    expect(hasStaticQrSvg).toBe(false);

    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(container.textContent).toContain('$5.000 COP');
  });
});
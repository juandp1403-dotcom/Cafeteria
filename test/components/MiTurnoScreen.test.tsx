// @vitest-environment jsdom
/**
 * Tests de `MiTurnoScreen` — pantalla que ve el aprendiz después de confirmar.
 *
 * Regresión principal: la pantalla NO debe renderizar QR ni código de barras
 * (se eliminaron por requisito de negocio), y debe mostrar siempre el turno y el
 * total reales del pedido.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiTurnoScreen } from '../../src/components/MiTurnoScreen';
import type { Order, OrderStatus } from '../../src/types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-test',
    numeroTurno: '#001',
    fecha: '17/09/2026',
    hora: '10:30',
    cliente: {
      nombre: 'María Pérez',
      documento: '1020304050',
      ficha: '2671234',
      programa: 'ADSO',
    },
    items: [{ nombre: 'Empanada Artesanal', cantidad: 1, precioUnitario: 5000, total: 5000 }],
    metodoPago: 'Efectivo',
    subtotal: 5000,
    descuento: 0,
    total: 5000,
    estado: 'pendiente_pago',
    faseActual: 1,
    idVenta: '#VTA-99',
    mesaKiosko: 'Kiosko A-01',
    ...overrides,
  } as Order;
}

interface RenderOpts {
  order?: Order;
  onNewOrder?: () => void;
  onOpenReceipt?: () => void;
  onAdvanceState?: (s: OrderStatus) => void;
}

function renderTurno({
  order = makeOrder(),
  onNewOrder = vi.fn(),
  onOpenReceipt = vi.fn(),
  onAdvanceState,
}: RenderOpts = {}) {
  const utils = render(
    <MiTurnoScreen
      order={order}
      onNewOrder={onNewOrder}
      onOpenReceipt={onOpenReceipt}
      onAdvanceState={onAdvanceState}
    />
  );
  return { ...utils, onNewOrder, onOpenReceipt, onAdvanceState };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MiTurnoScreen — regresión: sin QR ni código de barras', () => {
  it('no renderiza el bloque de escaneo en ventanilla', () => {
    renderTurno();
    expect(screen.queryByText('ESCANEO EN VENTANILLA DE DESPACHO')).not.toBeInTheDocument();
  });

  it('no renderiza el código de barras estático', () => {
    renderTurno();
    expect(screen.queryByText('9842-1042-SENA')).not.toBeInTheDocument();
  });

  it('no renderiza ningún SVG con rectángulo negro (falso QR estático)', () => {
    const { container } = renderTurno();

    const hasStaticQrSvg = Array.from(container.querySelectorAll('svg')).some((svg) =>
      Array.from(svg.querySelectorAll('rect')).some((rect) => rect.getAttribute('fill') === '#000000')
    );
    expect(hasStaticQrSvg).toBe(false);
  });

  it('no contiene etiquetas de imagen QR', () => {
    const { container } = renderTurno();
    expect(container.querySelector('img[alt*="QR" i]')).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain('qrcode');
  });
});

describe('MiTurnoScreen — información del turno', () => {
  it('muestra el número de turno y su rótulo', () => {
    renderTurno();

    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('TURNO GENERAL')).toBeInTheDocument();
  });

  it('muestra el total con formato de pesos colombianos', () => {
    const { container } = renderTurno();

    expect(container.textContent).toContain('$5.000 COP');
  });

  it('muestra el estado actual del pedido en mayúsculas', () => {
    renderTurno({ order: makeOrder({ estado: 'pendiente_pago' }) });
    expect(screen.getByText(/Estado: PENDIENTE PAGO/)).toBeInTheDocument();
  });
it('muestra la fase del despacho', () => {
    renderTurno();

    // El mapeo de currentStep solo distingue los estados del pipeline de despacho;
    // cualquier otro estado (incluido `pendiente_pago`) cae en el paso 4.
    expect(document.body.textContent).toContain('Fase 4 de 4');
  });

  it('muestra la hora aprobada del pedido', () => {
    renderTurno();
    expect(screen.getByText('Aprobado a las 10:30')).toBeInTheDocument();
  });

  it('muestra el total con formato de pesos colombianos en los montos grandes', () => {
    const { container } = renderTurno({
      order: makeOrder({
        subtotal: 23000,
        descuento: 0,
        total: 23000,
        items: [{ nombre: 'Combo Almuerzo', cantidad: 1, precioUnitario: 23000, total: 23000 }],
      }),
    });

    expect(container.textContent).toContain('$23.000');
  });
});

describe('MiTurnoScreen — acciones del aprendiz', () => {
  it('permite iniciar un nuevo pedido', async () => {
    const user = userEvent.setup();
    const { onNewOrder } = renderTurno();

    await user.click(screen.getByRole('button', { name: /Realizar Nuevo Pedido/i }));

    expect(onNewOrder).toHaveBeenCalledTimes(1);
  });

  it('permite abrir el comprobante', async () => {
    const user = userEvent.setup();
    const { onOpenReceipt } = renderTurno();

    await user.click(screen.getByRole('button', { name: /Comprobante/i }));

    expect(onOpenReceipt).toHaveBeenCalledTimes(1);
  });
});

describe('MiTurnoScreen — stepper del despacho', () => {
  it('muestra las cuatro fases del despacho', () => {
    renderTurno();

    expect(screen.getByText('1. Pago Confirmado')).toBeInTheDocument();
    expect(screen.getByText('2. En Preparación')).toBeInTheDocument();
    expect(screen.getByText('3. Listo para Recoger')).toBeInTheDocument();
    expect(screen.getByText('4. Entregado & Finalizado')).toBeInTheDocument();
    expect(screen.getByText('Estado del Despacho')).toBeInTheDocument();
  });

  it('emite el estado correspondiente al pulsar cada paso', async () => {
    const user = userEvent.setup();
    const onAdvanceState = vi.fn();
    renderTurno({ onAdvanceState });

    const pasos = screen.getAllByTitle('Click para alternar estado');
    expect(pasos).toHaveLength(4);

    await user.click(pasos[0]);
    expect(onAdvanceState).toHaveBeenLastCalledWith('pago_confirmado');

    await user.click(pasos[1]);
    expect(onAdvanceState).toHaveBeenLastCalledWith('en_preparacion');

    await user.click(pasos[2]);
    expect(onAdvanceState).toHaveBeenLastCalledWith('listo_recoger');

    await user.click(pasos[3]);
    expect(onAdvanceState).toHaveBeenLastCalledWith('entregado');
    expect(onAdvanceState).toHaveBeenCalledTimes(4);
  });

  it('no revienta si onAdvanceState no se proporciona', async () => {
    const user = userEvent.setup();
    renderTurno({ onAdvanceState: undefined });

    const pasos = screen.getAllByTitle('Click para alternar estado');
    await expect(user.click(pasos[0])).resolves.toBeUndefined();
    await expect(user.click(pasos[2])).resolves.toBeUndefined();
  });

  it('marca la fase alcanzada según el estado del pedido', () => {
    renderTurno({ order: makeOrder({ estado: 'en_preparacion' }) });
    expect(screen.getByText('Fase 2 de 4')).toBeInTheDocument();

    renderTurno({ order: makeOrder({ estado: 'listo_recoger' }) });
    expect(document.body.textContent).toContain('Fase 3 de 4');
  });
});
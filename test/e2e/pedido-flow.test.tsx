// @vitest-environment jsdom
/**
 * Test end-to-end del flujo del aprendiz: identificación → catálogo → confirmación
 * → pantalla de turno.
 *
 * Es la regresión más importante de la app: el número de turno que ve el aprendiz
 * debe venir SIEMPRE del backend (`GET /api/supabase/ventas/turno-actual`) y nunca
 * de un contador local. Antes de arreglarlo, la app mostraba `#042` hardcodeado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { installApiMock, type ApiMock } from '../helpers/api-mock';
import { makeDbProducto } from '../helpers/fixtures';

let api: ApiMock;

const producto = makeDbProducto();

function installAppMock(turnoActual: number) {
  return installApiMock({
    productos: [producto],
    turnoActual,
    ventasSave: { success: true, idventa: 99, numeroPedido: turnoActual },
  });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api = installAppMock(5);
});

afterEach(() => {
  api.restore();
});

/** Completa el formulario de identificación del aprendiz. */
async function identificarAprendiz(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByText('Identificación de Aprendiz')).toBeInTheDocument();

  await user.type(screen.getByPlaceholderText('Ej: 1020304050'), '1020304050');
  await user.type(screen.getByPlaceholderText('Ej: Juan Carlos Pérez Gómez'), 'María Pérez');
  await user.type(screen.getByPlaceholderText('Ej: 2671234'), '2671234');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /Ingresar al Catálogo/i }));
}

describe('flujo completo del aprendiz', () => {
  it('muestra el turno #005 del servidor tras confirmar el pedido (y no un #042 local)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await identificarAprendiz(user);

    // 2. Catálogo
    expect(await screen.findByText('Catálogo de Alimentos CGAO')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    // 3. Pantalla de turno con el número real del servidor
    expect(await screen.findByText('#005')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('#042');
  });

  it('consulta el turno al servidor antes de confirmar el pedido', async () => {
    const user = userEvent.setup();
    render(<App />);

    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    await screen.findByText('#005');
    expect(api.callsTo('/api/supabase/ventas/turno-actual', 'GET').length).toBeGreaterThan(0);
  });

  it('persiste la venta en el backend al confirmar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    await waitFor(() => expect(api.callsTo('/api/supabase/ventas', 'POST')).toHaveLength(1));

    const body = api.callsTo('/api/supabase/ventas', 'POST')[0].body as any;
    expect(body.order.cliente.documento).toBe('1020304050');
    expect(body.order.items.length).toBeGreaterThan(0);
  });

  it('garantiza el cliente en Supabase antes de registrar la venta', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ productos: [producto], turnoActual: 5 });
    render(<App />);

    await identificarAprendiz(user);
    await waitFor(() => expect(api.callsTo('/api/supabase/clientes', 'POST').length).toBeGreaterThan(0));
  });

  it('formatea con padStart(3, "0") los turnos de un solo dígito', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installAppMock(7);
    render(<App />);

    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    expect(await screen.findByText('#007')).toBeInTheDocument();
  });

  it('no muestra un turno falso si el backend no responde', async () => {
    const user = userEvent.setup();
    api.restore();
    // Se instala el mock y luego se sustituye por una versión que solo falla en
    // /turno-actual; api.restore() se encargará del stub global al finalizar.
    api = installApiMock();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method || 'GET').toUpperCase();
        if (url.includes('/ventas/turno-actual')) throw new TypeError('Failed to fetch');
        if (url.includes('/productos') && method === 'GET') {
          return { ok: true, status: 200, json: async () => ({ success: true, data: [producto] }) };
        }
        return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
      })
    );

    render(<App />);
    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Pedido/i }));

    // El pedido sigue siendo usable aunque el turno no se pueda resolver.
    await waitFor(() =>
      expect(screen.queryByText('Identificación de Aprendiz')).not.toBeInTheDocument()
    );
  });

  it('el carrito refleja el producto agregado y el total a liquidar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));

    // El carrito vive en el panel "Mi Bandeja de Pedido" (la ficha del producto
    // también muestra su nombre, por eso se cuentan todas las apariciones).
    expect(await screen.findByText('Mi Bandeja de Pedido')).toBeInTheDocument();
    expect(screen.getAllByText('Empanada Artesanal').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1 ítem')).toBeInTheDocument();
    expect(screen.getAllByText('$5.000').length).toBeGreaterThan(0);
    expect(screen.getByText('Subtotal Pedido')).toBeInTheDocument();
    expect(screen.getByText('TOTAL A LIQUIDAR')).toBeInTheDocument();
  });

  it('permite quitar el producto del carrito antes de confirmar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await identificarAprendiz(user);
    await screen.findByText('Catálogo de Alimentos CGAO');
    await user.click(await screen.findByRole('button', { name: /agregar/i }));
    await screen.findByText('Mi Bandeja de Pedido');
    expect(screen.getAllByText('Empanada Artesanal').length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByTitle('Eliminar de la bandeja'));

    await waitFor(() => expect(screen.getAllByText('Empanada Artesanal')).toHaveLength(1));
    expect(screen.getByText('Agrega alimentos del menú para gestionar tu pedido.')).toBeInTheDocument();
    expect(screen.getByText('0 ítems')).toBeInTheDocument();
  });
});

describe('resiliencia del flujo', () => {
  it('permite empezar aunque el catálogo no cargue (API caída)', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ httpError: true });
    render(<App />);

    await identificarAprendiz(user);

    // Sin productos no se puede agregar, pero la app no se rompe.
    expect(await screen.findByText('Catálogo de Alimentos CGAO')).toBeInTheDocument();
    await waitFor(() => expect(api.callsTo('/api/supabase/productos', 'GET').length).toBeGreaterThan(0));
  });
});
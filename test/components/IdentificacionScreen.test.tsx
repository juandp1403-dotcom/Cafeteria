// @vitest-environment jsdom
/**
 * Tests del registro del aprendiz (`IdentificacionScreen`).
 *
 * Cubre las tres capas de la pantalla:
 *  1. validación de campos y del checkbox obligatorio de la Ley 1581,
 *  2. sincronización con la tabla `cliente` de Supabase (buscar + garantizar),
 *  3. emisión de `onUpdateUser` verificado y `onStartOrder`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentificacionScreen } from '../../src/components/IdentificacionScreen';
import type { UserAprendiz } from '../../src/types';
import { installApiMock, type ApiMock } from '../helpers/api-mock';

let api: ApiMock;
let onUpdateUser: ReturnType<typeof vi.fn>;
let onStartOrder: ReturnType<typeof vi.fn>;
let onGoToAccesoPersonal: ReturnType<typeof vi.fn>;

const user: UserAprendiz = {
  nombre: '',
  documento: '',
  ficha: '',
  programa: 'ADSO',
  tipoDoc: 'C.C. Cédula',
  verificado: false,
} as UserAprendiz;

function renderScreen(overrides: Partial<UserAprendiz> = {}) {
  return render(
    <IdentificacionScreen
      user={{ ...user, ...overrides }}
      onUpdateUser={onUpdateUser}
      onStartOrder={onStartOrder}
      onGoToAccesoPersonal={onGoToAccesoPersonal}
    />
  );
}

beforeEach(() => {
  onUpdateUser = vi.fn();
  onStartOrder = vi.fn();
  onGoToAccesoPersonal = vi.fn();
  api = installApiMock();
});

afterEach(() => {
  api.restore();
});

const getDocumento = () => screen.getByPlaceholderText('Ej: 1020304050');
const getNombre = () => screen.getByPlaceholderText('Ej: Juan Carlos Pérez Gómez');
const getFicha = () => screen.getByPlaceholderText('Ej: 2671234');
const getLey1581 = () => screen.getByRole('checkbox');
const getSubmit = () => screen.getByRole('button', { name: /ingresar al catálogo/i });

/** Completa el formulario y acepta la Ley 1581. */
async function fillValidForm(u: ReturnType<typeof userEvent.setup>) {
  await u.type(getDocumento(), '1020304050');
  await u.type(getNombre(), 'Juan Carlos Pérez');
  await u.type(getFicha(), '2671234');
  await u.click(getLey1581());
}

describe('IdentificacionScreen — renderizado', () => {
  it('muestra el kiosco institucional y la leyenda de datos protegidos', () => {
    renderScreen();

    expect(screen.getByText(/KIOSCO DIGITAL CGAO/i)).toBeInTheDocument();
    expect(screen.getByText('Identificación de Aprendiz')).toBeInTheDocument();
    expect(screen.getAllByText(/Ley 1581 de 2012/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Datos protegidos Ley 1581 de 2012/i)).toBeInTheDocument();
  });

  it('no expone un campo editable para el programa (se arrastra del usuario)', () => {
    renderScreen({ programa: 'SENA / Contabilidad' });

    // El select de tipo de documento es el único <select> del formulario.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByDisplayValue('SENA / Contabilidad')).not.toBeInTheDocument();
  });

  it('prellena los campos con los datos que ya tiene el usuario', () => {
    renderScreen({ documento: '99887766', nombre: 'Ana Ruiz', ficha: '1122334', tipoDoc: 'T.I. Tarjeta Identidad' });

    expect(getDocumento()).toHaveValue('99887766');
    expect(getNombre()).toHaveValue('Ana Ruiz');
    expect(getFicha()).toHaveValue('1122334');
    expect(screen.getByDisplayValue('T.I. Tarjeta Identidad')).toBeInTheDocument();
  });

  it('mantiene el botón de continuar deshabilitado hasta aceptar la Ley 1581', async () => {
    const u = userEvent.setup();
    renderScreen();

    expect(getSubmit()).toBeDisabled();

    await u.click(getLey1581());
    expect(getSubmit()).toBeEnabled();

    await u.click(getLey1581());
    expect(getSubmit()).toBeDisabled();
  });

  it('encuentra el acceso del personal desde el kiosco', async () => {
    const u = userEvent.setup();
    renderScreen();

    await u.click(screen.getByRole('button', { name: /acceso personal/i }));
    expect(onGoToAccesoPersonal).toHaveBeenCalledTimes(1);
  });
});

describe('IdentificacionScreen — validación', () => {
  it('exige aceptar la Ley 1581 antes de continuar', async () => {
    const u = userEvent.setup();
    renderScreen();
    getSubmit().removeAttribute('disabled');

    await u.type(getDocumento(), '1020304050');
    await u.type(getNombre(), 'Juan Carlos Pérez');
    await u.type(getFicha(), '2671234');
    await u.click(getSubmit());

    expect(
      screen.getByText(/Debes aceptar los términos y tratamiento de datos personales/i)
    ).toBeInTheDocument();
    expect(onStartOrder).not.toHaveBeenCalled();
  });

  it('exige documento y nombre completos', async () => {
    const u = userEvent.setup();
    renderScreen();
    getDocumento().removeAttribute('required');
    getNombre().removeAttribute('required');
    getFicha().removeAttribute('required');

    await u.click(getLey1581());
    await u.click(getSubmit());

    expect(
      screen.getByText('Por favor completa el número de documento y tu nombre completo.')
    ).toBeInTheDocument();
    expect(onStartOrder).not.toHaveBeenCalled();
    expect(onUpdateUser).not.toHaveBeenCalled();
  });

  it('limpia el aviso de la Ley 1581 en cuanto se marca la casilla', async () => {
    const u = userEvent.setup();
    renderScreen();
    getSubmit().removeAttribute('disabled');

    await u.type(getDocumento(), '1020304050');
    await u.type(getNombre(), 'Juan Carlos Pérez');
    await u.type(getFicha(), '2671234');
    await u.click(getSubmit());
    expect(screen.getByText(/Debes aceptar los términos/i)).toBeInTheDocument();

    await u.click(getLey1581());
    expect(screen.queryByText(/Debes aceptar los términos/i)).not.toBeInTheDocument();
  });

  it('la validación nativa impide el envío con campos vacíos', async () => {
    const u = userEvent.setup();
    renderScreen();
    await u.click(getLey1581());

    expect((getDocumento() as HTMLInputElement).validity.valueMissing).toBe(true);
    await u.click(getSubmit());
    expect(onStartOrder).not.toHaveBeenCalled();
  });
});

describe('IdentificacionScreen — sincronización con la tabla cliente', () => {
  it('consulta el cliente por documento y sobrescribe nombre/ficha con los de la BD', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({
      cliente: { success: true, data: { nombre: 'María Pérez Gómez', ficha: 9988776 } },
      clienteSave: { success: true },
    });
    renderScreen();
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalled());

    expect(api.callsTo('/api/supabase/clientes/1020304050', 'GET')).toHaveLength(1);
    expect(api.callsTo('/api/supabase/clientes', 'POST')[0].body).toEqual({
      documento: 1020304050,
      nombre: 'María Pérez Gómez',
      ficha: 9988776,
    });
    expect(onUpdateUser.mock.calls[0][0]).toMatchObject({
      nombre: 'María Pérez Gómez',
      ficha: '9988776',
      verificado: true,
    });
  });

  it('conserva los datos escritos si el cliente aún no existe en la BD', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen();
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalled());
    expect(api.callsTo('/api/supabase/clientes', 'POST')[0].body).toEqual({
      documento: 1020304050,
      nombre: 'Juan Carlos Pérez',
      ficha: 2671234,
    });
  });

  it('no bloquea el ingreso si Supabase no responde (modo offline)', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ networkError: true });
    renderScreen();
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onStartOrder).toHaveBeenCalledTimes(1));
    expect(onUpdateUser.mock.calls[0][0]).toMatchObject({
      nombre: 'Juan Carlos Pérez',
      verificado: true,
    });
  });

  it('normaliza el documento con puntos y guiones antes de consultar', async () => {
    const u = userEvent.setup();
    renderScreen();

    await u.type(getDocumento(), '1.020.304.050-1');
    await u.type(getNombre(), 'Juan Carlos Pérez');
    await u.type(getFicha(), '2671234');
    await u.click(getLey1581());
    await u.click(getSubmit());

    await waitFor(() => expect(api.callsTo('/api/supabase/clientes/')).toHaveLength(1));
    expect(api.callsTo('/api/supabase/clientes/')[0].path).toBe('/api/supabase/clientes/10203040501');
  });
});

describe('IdentificacionScreen — continuación del flujo', () => {
  it('marca al aprendiz como verificado y arranca el pedido', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen();
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onStartOrder).toHaveBeenCalledTimes(1));

    const actualizado = onUpdateUser.mock.calls[0][0];
    expect(actualizado).toMatchObject({
      documento: '1020304050',
      nombre: 'Juan Carlos Pérez',
      ficha: '2671234',
      programa: 'ADSO',
      tipoDoc: 'C.C. Cédula',
      verificado: true,
    });
  });

  it('propaga el tipo de documento seleccionado', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen();

    await u.selectOptions(screen.getByDisplayValue('C.C. Cédula'), 'P.E.P.');
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalled());
    expect(onUpdateUser.mock.calls[0][0].tipoDoc).toBe('P.E.P.');
  });

  it('aplica el programa por defecto (ADSO) si el usuario no trae ninguno', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen({ programa: '' });
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalled());
    expect(onUpdateUser.mock.calls[0][0].programa).toBe('ADSO / Análisis y Desarrollo de Software');
  });

  it('conserva el programa que ya traía el usuario', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen({ programa: 'SENA / Contabilidad' });
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalled());
    expect(onUpdateUser.mock.calls[0][0].programa).toBe('SENA / Contabilidad');
  });

  it('solo llama a onStartOrder una vez por envío válido', async () => {
    const u = userEvent.setup();
    api.restore();
    api = installApiMock({ cliente: { success: true, data: null } });
    renderScreen();
    await fillValidForm(u);
    await u.click(getSubmit());

    await waitFor(() => expect(onStartOrder).toHaveBeenCalledTimes(1));
    expect(onStartOrder).toHaveBeenCalledTimes(1);
  });
});
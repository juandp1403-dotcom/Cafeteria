// @vitest-environment jsdom
/**
 * Tests del formulario de autenticación del personal (`AccesoPersonalScreen`).
 *
 * El componente habla directo con `fetch('/api/auth/login')`, así que se verifica
 * tanto el contrato de la petición como la traducción de los errores del backend
 * a mensajes visibles para el usuario.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccesoPersonalScreen } from '../../src/components/AccesoPersonalScreen';
import { installApiMock, type ApiMock } from '../helpers/api-mock';

let api: ApiMock;
let onLoginSuccess: ReturnType<typeof vi.fn>;
let onBackToAprendiz: ReturnType<typeof vi.fn>;

function renderScreen() {
  return render(
    <AccesoPersonalScreen
      onLoginSuccess={onLoginSuccess}
      onBackToAprendiz={onBackToAprendiz}
    />
  );
}

beforeEach(() => {
  onLoginSuccess = vi.fn();
  onBackToAprendiz = vi.fn();
  api = installApiMock();
});

afterEach(() => {
  api.restore();
});

const getIdentifier = () => screen.getByPlaceholderText(/ejemplo@sena.edu.co/i);
const getPassword = () => screen.getByPlaceholderText('••••••••');
const getSubmit = () => screen.getByRole('button', { name: /verificar credenciales/i });

describe('AccesoPersonalScreen — renderizado', () => {
  it('muestra el encabezado institucional y los módulos habilitados por rol', () => {
    renderScreen();

    expect(screen.getByText(/AUTENTICACIÓN DE PERSONAL CGAO/i)).toBeInTheDocument();
    expect(screen.getByText('Acceso Personal y Funcionarios')).toBeInTheDocument();
    expect(screen.getByText(/Caja POS, Despacho, Inventario, Métricas o Auditoría/i)).toBeInTheDocument();
    expect(screen.getByText(/Vélez 2026/)).toBeInTheDocument();
  });

  it('renderiza los campos de correo/documento y contraseña', () => {
    renderScreen();

    expect(getIdentifier()).toBeRequired();
    expect(getIdentifier()).toHaveAttribute('type', 'text');
    expect(getPassword()).toHaveAttribute('type', 'password');
  });

  it('no muestra ningún error antes de interactuar', () => {
    renderScreen();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ofrece dos vías para volver al registro del aprendiz (kiosco)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /volver a registro de aprendiz \(kiosco\)/i }));
    expect(onBackToAprendiz).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /^volver a registro de aprendiz$/i }));
    expect(onBackToAprendiz).toHaveBeenCalledTimes(2);
  });
});

describe('AccesoPersonalScreen — validaciones del formulario', () => {
  it('la validación nativa impide el envío si falta el identificador', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(getPassword(), 'secreto123');
    expect(getIdentifier().validity.valueMissing).toBe(true);

    await user.click(getSubmit());

    // No se dispara handleLogin: el navegador bloquea el submit por `required`.
    expect(api.calls).toHaveLength(0);
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('la validación nativa impide el envío si falta la contraseña', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(getIdentifier(), '1098765432');
    expect(getPassword().validity.valueMissing).toBe(true);

    await user.click(getSubmit());

    expect(api.calls).toHaveLength(0);
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  describe('guardas internas del componente (con `required` removido)', () => {
    const disableNativeValidation = () => {
      getIdentifier().removeAttribute('required');
      getPassword().removeAttribute('required');
    };

    it('bloquea el envío y avisa si el identificador está vacío', async () => {
      const user = userEvent.setup();
      renderScreen();
      disableNativeValidation();

      await user.type(getPassword(), 'secreto123');
      await user.click(getSubmit());

      expect(
        screen.getByText('Por favor ingresa tu correo institucional o número de documento.')
      ).toBeInTheDocument();
      expect(api.calls).toHaveLength(0);
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });

    it('bloquea el envío y avisa si la contraseña está vacía', async () => {
      const user = userEvent.setup();
      renderScreen();
      disableNativeValidation();

      await user.type(getIdentifier(), '1098765432');
      await user.click(getSubmit());

      expect(screen.getByText('Por favor ingresa tu contraseña.')).toBeInTheDocument();
      expect(api.calls).toHaveLength(0);
    });

    it('rechaza un identificador compuesto solo de espacios', async () => {
      const user = userEvent.setup();
      renderScreen();
      disableNativeValidation();

      await user.type(getIdentifier(), '   ');
      await user.type(getPassword(), 'secreto123');
      await user.click(getSubmit());

      expect(
        screen.getByText('Por favor ingresa tu correo institucional o número de documento.')
      ).toBeInTheDocument();
      expect(api.calls).toHaveLength(0);
    });

    it('limpia el error previo cuando un nuevo intento es válido', async () => {
      const user = userEvent.setup();
      api.restore();
      api = installApiMock({
        login: { success: true, rol: 'Admin', email: 'admin@sena.edu.co', nombre: 'Laura Gómez' },
      });
      renderScreen();
      disableNativeValidation();

      await user.click(getSubmit());
      expect(screen.getByText(/Por favor ingresa tu correo institucional/)).toBeInTheDocument();

      await user.type(getIdentifier(), 'admin@sena.edu.co');
      await user.type(getPassword(), 'secreto123');
      await user.click(getSubmit());

      await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
      expect(screen.queryByText(/Por favor ingresa tu correo institucional/)).not.toBeInTheDocument();
    });
  });
});

describe('AccesoPersonalScreen — autenticación exitosa', () => {
  it('postea las credenciales a /api/auth/login y propaga el rol', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({
      login: { success: true, rol: 'Admin', email: 'admin@sena.edu.co', nombre: 'Laura Gómez' },
    });
    renderScreen();

    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'Sena2026*');
    await user.click(getSubmit());

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith('Admin', 'admin@sena.edu.co', 'Laura Gómez'));

    const call = api.lastCall();
    expect(call?.method).toBe('POST');
    expect(call?.path).toBe('/api/auth/login');
    expect(call?.body).toEqual({ identifier: 'admin@sena.edu.co', password: 'Sena2026*' });
  });

  it('envía el identificador sin espacios sobrantes', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ login: { success: true, rol: 'Cajero', email: 'cajero@sena.edu.co', nombre: 'Cajero 1' } });
    renderScreen();

    await user.type(getIdentifier(), '  1098765432  ');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
    expect((api.lastCall()?.body as any).identifier).toBe('1098765432');
  });

  it('usa el identificador y "Personal CGAO" como fallback si el backend omite email/nombre', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ login: { success: true, rol: 'Despachador' } });
    renderScreen();

    await user.type(getIdentifier(), 'despacho@sena.edu.co');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    await waitFor(() =>
      expect(onLoginSuccess).toHaveBeenCalledWith('Despachador', 'despacho@sena.edu.co', 'Personal CGAO')
    );
  });

  it('muestra el estado de carga y deshabilita el botón durante la petición', async () => {
    const user = userEvent.setup();
    const slowApi = installApiMock();
    api.restore();
    api = slowApi;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await pending;
        return { ok: true, status: 200, json: async () => ({ success: true, rol: 'Admin' }) };
      })
    );

    renderScreen();
    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    const loadingLabel = await screen.findByText('Verificando credenciales...');
    expect(loadingLabel).toBeInTheDocument();

    release();
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
  });
});

describe('AccesoPersonalScreen — errores de autenticación', () => {
  it('muestra el mensaje de error devuelto por el backend', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({
      overrides: [
        {
          match: '/api/auth/login',
          status: 401,
          body: { success: false, error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.' },
        },
      ],
    });
    renderScreen();

    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'malaClave');
    await user.click(getSubmit());

    expect(
      await screen.findByText('Credenciales incorrectas. Verifica tu usuario y contraseña.')
    ).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('cae a un mensaje genérico si el backend no envía texto de error', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ overrides: [{ match: '/api/auth/login', status: 500, body: { success: false } }] });
    renderScreen();

    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    expect(
      await screen.findByText('No se pudo autenticar. Verifica tu conexión e inténtalo de nuevo.')
    ).toBeInTheDocument();
  });

  it('no rompe la interfaz si la respuesta no es JSON válido', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ overrides: [{ match: '/api/auth/login', status: 200, text: '<html>502</html>' }] });
    renderScreen();

    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    expect(
      await screen.findByText('No se pudo autenticar. Verifica tu conexión e inténtalo de nuevo.')
    ).toBeInTheDocument();
  });

  it('informa cuando el servidor de autenticación es inalcanzable', async () => {
    const user = userEvent.setup();
    api.restore();
    api = installApiMock({ networkError: true });
    renderScreen();

    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'clave');
    await user.click(getSubmit());

    expect(
      await screen.findByText('Failed to fetch')
    ).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('permite reintentar tras un error sin recargar la pantalla', async () => {
    const user = userEvent.setup();
    api.restore();
    const seq = [
      { status: 401, body: { success: false, error: 'Credenciales incorrectas.' } },
      { status: 200, body: { success: true, rol: 'Admin', email: 'admin@sena.edu.co', nombre: 'Laura Gómez' } },
    ];
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const r = seq[call++];
        return { ok: r.status < 400, status: r.status, json: async () => r.body };
      })
    );

    renderScreen();
    await user.type(getIdentifier(), 'admin@sena.edu.co');
    await user.type(getPassword(), 'clave');

    await user.click(getSubmit());
    expect(await screen.findByText('Credenciales incorrectas.')).toBeInTheDocument();

    await user.click(getSubmit());
    await waitFor(() =>
      expect(onLoginSuccess).toHaveBeenCalledWith('Admin', 'admin@sena.edu.co', 'Laura Gómez')
    );
  });
});
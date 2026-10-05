/**
 * Configuración compartida por la suite de tests y el arranque del servidor de pruebas.
 *
 * IMPORTANTE: todas las credenciales de Supabase se fuerzan a cadena vacía para que la
 * suite NUNCA toque la base de datos real. Sin credenciales, `server.ts` arranca en
 * "modo autónomo en memoria" (in-memory mock), que es exactamente el comportamiento
 * que queremos verificar de forma determinista.
 */

/** Puerto dedicado al servidor Express levantado por global-setup (no usar 3589 ni 3957). */
export const TEST_SERVER_PORT = 3961;

/** URL base del servidor de pruebas. */
export const TEST_SERVER_BASE_URL = `http://127.0.0.1:${TEST_SERVER_PORT}`;

/** Variables de entorno seguras para tests (sin secretos, sin red real). */
export function testServerEnv(): Record<string, string> {
  return {
    NODE_ENV: 'production',
    PORT: String(TEST_SERVER_PORT),
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SUPABASE_SECRET_KEY: '',
    SUPABASE_PUBLISHABLE_KEY: '',
    SUPABASE_JWKS_URL: '',
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
    DISABLE_HMR: 'true',
  };
}

/** Credenciales del administrador institucional sembrado por el servidor. */
export const ADMIN_CREDENTIALS = {
  email: 'admin@sena.edu.co',
  password: 'admin1234',
  documento: '1098765432',
  nombre: 'Administrador SENA CGAO',
} as const;
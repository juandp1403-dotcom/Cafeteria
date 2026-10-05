/**
 * Setup global de la suite (jsdom).
 *
 * - Importa los matchers de jest-dom (`toBeInTheDocument`, `toHaveTextContent`, etc.).
 * - Rellena los huecos de la API de navegador que jsdom NO implementa y que la app usa
 *   para exportar CSV/Excel (Blob + URL.createObjectURL) e imprimir (`window.print`).
 * - Limpia localStorage entre tests para que la persistencia de sesión (App.tsx) no se
 *   contamine entre casos.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// --- jsdom no implementa URL.createObjectURL (exportaciones CSV / Excel) ---
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn(() => 'blob:mock/cgao-test'),
  });
}
if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

// --- jsdom no implementa window.print (botón "Imprimir" del comprobante) ---
const hasDom = typeof window !== 'undefined';

if (hasDom) {
  window.print = vi.fn();
}

// `setupFiles` se ejecuta también en los tests con `@vitest-environment node`
// (integración HTTP), donde no existe `window`. Todo lo de jsdom va protegido.
beforeEach(() => {
  if (!hasDom) return;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  if (hasDom) {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});
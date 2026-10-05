/**
 * Global setup de Vitest.
 *
 * Levanta UNA única instancia de `server.ts` como proceso hijo (modo mock en memoria,
 * sin credenciales de Supabase) y espera a que /api/health responda. Todos los tests
 * de integración HTTP comparten ese mismo servidor.
 *
 * La instancia se apaga automáticamente al terminar la suite (teardown).
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { TEST_SERVER_BASE_URL, TEST_SERVER_PORT, testServerEnv } from './helpers/server-config';

let serverProcess: ChildProcessWithoutNullStreams | null = null;
const logLines: string[] = [];

function tsxCliPath(): string {
  return path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

async function waitForHealth(timeoutMs = 45_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${TEST_SERVER_BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // El listener todavía no está listo.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `El servidor de pruebas no respondió /api/health en ${timeoutMs}ms.\n` +
      `Últimas líneas del log:\n${logLines.slice(-30).join('\n')}`
  );
}

export async function setup(): Promise<void> {
  serverProcess = spawn(process.execPath, [tsxCliPath(), 'server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, ...testServerEnv() },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const collect = (chunk: Buffer) => {
    const lines = chunk.toString('utf8').split(/\r?\n/).filter(Boolean);
    logLines.push(...lines);
    if (logLines.length > 200) logLines.splice(0, logLines.length - 200);
  };
  serverProcess.stdout.on('data', collect);
  serverProcess.stderr.on('data', collect);

  serverProcess.on('error', (err) => {
    logLines.push(`[spawn error] ${err.message}`);
  });

  await waitForHealth();

  const health = await fetch(`${TEST_SERVER_BASE_URL}/api/health`).then((r) => r.json());
  if (health?.status !== 'ok') {
    throw new Error(`Healthcheck inesperado: ${JSON.stringify(health)}`);
  }
  if (health?.mode !== 'in-memory-mock') {
    throw new Error(
      'Los tests deben correr en modo "in-memory-mock". Revisa que las variables de entorno ' +
        'de Supabase estén vacías en test/helpers/server-config.ts para no tocar la BD real. ' +
        `Modo recibido: ${health?.mode}`
    );
  }
}

export async function teardown(): Promise<void> {
  if (!serverProcess) return;
  const proc = serverProcess;
  serverProcess = null;
  await new Promise<void>((resolve) => {
    const force = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* proceso ya muerto */
      }
      resolve();
    }, 8000);
    proc.once('exit', () => {
      clearTimeout(force);
      resolve();
    });
    try {
      proc.kill('SIGTERM');
    } catch {
      clearTimeout(force);
      resolve();
    }
  });
}

/** Exportado para diagnóstico: URL efectiva usada por los tests. */
export const SERVER_URL = TEST_SERVER_BASE_URL;
export const SERVER_PORT = TEST_SERVER_PORT;
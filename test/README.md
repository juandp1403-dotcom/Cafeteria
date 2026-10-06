# Suite de pruebas — Cafetería SENA CGAO

Todo vive en `test/`. No hay tests fuera de esta carpeta.

## Estructura

```
test/
├── setup.ts                  Setup global (matchers de jest-dom, hooks de jsdom)
├── global-setup.ts           Levanta server.ts una vez en modo in-memory-mock
├── helpers/
│   ├── server-config.ts      Puerto, URL y env seguro (credenciales Supabase vacías)
│   ├── fixtures.ts           Factories: ProductItem, Order, DbProducto, DbVenta, Baja…
│   └── api-mock.ts           Mock de fetch con registro de llamadas y overrides por ruta
├── unit/                     Funciones puras: adaptadores de datos y de red
├── server/                   Integración HTTP contra Express real
├── components/               Unidades de React (jsdom + Testing Library)
└── e2e/                      Flujo completo identificación → catálogo → turno
```

## Cómo ejecutar

```bash
npm test                 # toda la suite
npm run test:unit
npm run test:server
npm run test:components
npm run test:e2e
npm run lint             # tsc --noEmit (incluye los tests)
```

## Decisiones importantes

- **Nunca toca Supabase.** `test/helpers/server-config.ts` fuerza todas las credenciales a
  cadena vacía, así que `server.ts` arranca en `mode: "in-memory-mock"`.
  `test/global-setup.ts` falla explícitamente si el modo no es `in-memory-mock`.
- **Un solo servidor por corrida.** `global-setup.ts` lo levanta en el puerto `3961` y lo
  mata en `teardown`. Los tests de `test/server/` comparten su estado en memoria, por eso
  la numeración de turno usa `describe` (orden secuencial por defecto en Vitest 5).
- **Entornos por archivo.** El predeterminado es `jsdom`; los archivos en `test/server/`
  declaran `// @vitest-environment node` y `test/setup.ts` protege todo acceso a `window`
  para que funcione en ambos mundos.
- **Los mocks de red registran llamadas.** `installApiMock()` devuelve `calls`, `callsTo()`
  y `lastCall()` para asertar la ruta, el método y el body enviado al backend.

## Hallazgos documentados (tests que fijan el comportamiento actual)

Algunos tests afirman el comportamiento real en lugar del comportamiento deseado. Si se
corrige el código, hay que actualizar también el test:

| Ubicación | Comportamiento actual |
|---|---|
| `test/server/api.test.ts` | El mock **no descuenta el stock** al registrar una baja (depende del trigger de PostgreSQL). |
| `test/server/api.test.ts` | `PATCH /ventas/:id/estado` responde `200` aunque la venta no exista o el estado no esté en el catálogo. |
| `test/server/api.test.ts` | `POST /api/supabase/auditoria` no exige `usuario` en modo autónomo. |
| `test/server/api.test.ts` | `POST /api/supabase/ventas` valida solo el envoltorio `order`/`venta`, no el contenido de `items`. |
| `test/components/MiTurnoScreen.test.tsx` | `currentStep` solo reconoce los 4 estados del despacho; `pendiente_pago` cae en **Fase 4 de 4**. |
| `test/unit/supabase-api.test.ts` | `fetchPOSOrdersFromSupabase` pide `/pedidos`, que no existe: el catch-all devuelve HTML y el adaptador devuelve `null` (no borra el estado local). |

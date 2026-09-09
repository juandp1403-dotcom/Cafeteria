# Sistema Integral de Cafetería y Pedidos en Tiempo Real — CGAO SENA

Sistema integral web para la gestión de turnos, pedidos en kiosko de autoservicio, punto de venta (POS), cocina (KDS) y control de inventario de la cafetería institucional del **Centro de Gestión Agroempresarial del Oriente (CGAO)** — Regional Santander, SENA.

---

## Características Principales

1. **Kiosko de Autoservicio para Aprendices:**
   - Identificación rápida por documento o lectura de carnet.
   - Selección visual de menú, combos subsidiados y productos por categoría.
   - Generación de turno diario único con notificación sonora institucional.

2. **Caja Registradora / POS para Personal Operativo:**
   - Facturación rápida y cobro por saldo o efectivo.
   - Asignación y recarga de monederos institucionales.
   - Cierre de turno y arqueo de caja.

3. **Pantalla de Cocina / Despacho (KDS):**
   - Recepción en tiempo real de órdenes entrantes.
   - Control de estados: *En Preparación*, *Listo para Reclamar* y *Entregado*.

4. **Monitor Público de Turnos:**
   - Vista en pantalla grande con llamado auditivo a los aprendices cuando su pedido está listo.

5. **Gestión de Inventario y Catálogo:**
   - Control de existencias en tiempo real, precios de venta y costos unitarios.
   - Alertas de stock crítico.
   - Carga y actualización masiva de productos desde archivos Excel (.xlsx).

6. **Módulo de Bajas y Mermas:**
   - Registro de mermas, averías, caducidades y consumos internos con cálculo automático de pérdida económica.

7. **Auditoría y Trazabilidad:**
   - Registro cronológico inmutable de acciones realizadas por personal y administradores.

---

## Tecnologías Utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend:** Express, Node.js, `tsx`, `esbuild`.
- **Base de Datos Cloud:** Supabase (PostgreSQL 15+).
- **Herramientas:** Vite 6, SheetJS (`xlsx`).

---

## Requisitos Previos

- Node.js versión 18 o superior.
- npm versión 9 o superior.
- Cuenta o instancia activa en [Supabase](https://supabase.com).

---

## Configuración del Entorno

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd cafeteria-cgao-sena
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno creando un archivo `.env` a partir de `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Define tus credenciales de Supabase en `.env`:
   ```env
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<tu-clave-publica-anon>
   SUPABASE_SECRET_KEY=<tu-clave-secreta-service-role>
   SUPABASE_JWKS_URL=https://<tu-proyecto>.supabase.co/auth/v1/.well-known/jwks.json
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<tu-clave-publica-anon>
   ```

---

## Estructura de la Base de Datos (Supabase)

El esquema SQL completo con todas las tablas, relaciones e índices se encuentra en:
`05_ESQUEMA_SUPABASE_COMPLETO.sql`

Tablas principales:
- `producto`: Catálogo, precios, costos, stock y categorías.
- `cliente`: Aprendices y beneficiarios con documento y saldo.
- `admin` / `personal`: Personal autorizado y roles operativos.
- `venta` y `detalleventa`: Transacciones y líneas de pedido.
- `bajainventario`: Bajas por merma o caducidad.
- `registroauditoria`: Trazabilidad inmutable de acciones de personal.

---

## Comandos Disponibles

- **Iniciar en Modo Desarrollo:**
  ```bash
  npm run dev
  ```
  Inicia el servidor backend Express junto con el middleware de Vite en `http://localhost:3000`.

- **Compilar para Producción:**
  ```bash
  npm run build
  ```
  Genera los archivos estáticos en `dist/` y el servidor compilado en `dist/server.cjs`.

- **Ejecutar en Producción:**
  ```bash
  npm start
  ```

- **Validar TypeScript / Linting:**
  ```bash
  npm run lint
  ```

---

## Despliegue en Coolify con Docker

Este proyecto está completamente optimizado para ejecutarse en contenedores Docker a través de **Coolify** de forma segura y resiliente:

### 1. Despliegue directo en Coolify
1. En tu panel de Coolify, crea una nueva aplicación seleccionando **Git Repository (GitHub)**.
2. Selecciona este repositorio.
3. Configura el **Build Pack** como `Dockerfile` o `Docker Compose`.
4. Define el puerto de la aplicación: `3000`.
5. En la pestaña **Environment Variables**, agrega las credenciales de tu proyecto Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
6. Haz clic en **Deploy**. Coolify compilará la imagen multi-stage y habilitará el monitoreo de salud vía `/api/health`.

### 2. Ejecución local con Docker Compose
```bash
# Construir y levantar el contenedor
docker compose up --build -d

# Ver logs del contenedor
docker compose logs -f cafeteria-cgao

# Detener el contenedor
docker compose down
```

---

## Seguridad y Blindaje del Sistema

- **Base de Datos en Modo Solo Lectura (Zero-Insert Policy):** Para preservar la integridad de la base de datos de producción institucional, la aplicación no ejecuta ninguna operación de escritura (`INSERT`, `UPDATE`, `DELETE`) sobre Supabase. Toda la interacción de pedidos, mermas y auditoría opera de manera inmutable o en estado local sin alterar registros remotos.
- **Ejecución no-root (Least Privilege):** El contenedor Docker corre bajo el usuario sin privilegios `node` (UID 1000) en Alpine Linux, mitigando riesgos de elevación de privilegios en el host.
- **Encabezados de Seguridad OWASP:** El servidor Express inyecta automáticamente:
  - `X-Content-Type-Options: nosniff` (previene ataques de MIME sniffing).
  - `X-Frame-Options: SAMEORIGIN` (protección contra clickjacking).
  - `X-XSS-Protection: 1; mode=block`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - Ocultación de cabecera de servidor (`x-powered-by` deshabilitado).
- **Límite de Carga Útil (Payload Limit):** Cuerpo de peticiones HTTP restringido a 1MB para prevenir ataques DoS por sobrecarga de memoria.
- **Manejo Limpio de Señales (Graceful Shutdown):** Integración con `dumb-init` y escuchadores `SIGTERM`/`SIGINT` para asegurar que el contenedor se detenga sin dejar procesos zombies ni corromper conexiones.
- **Exclusión de Secretos en Git:** El archivo `.gitignore` y `.dockerignore` aíslan estrictamente `.env`, claves criptográficas (`*.key`, `*.pem`), logs y archivos sensibles.

---

## Licencia

Desarrollado para el **Centro de Gestión Agroempresarial del Oriente (CGAO) — SENA Regional Santander**. Uso institucional y académico.

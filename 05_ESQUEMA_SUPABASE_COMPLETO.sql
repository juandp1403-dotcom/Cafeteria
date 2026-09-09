-- =============================================================================
-- ARCHIVO: 05_ESQUEMA_SUPABASE_COMPLETO.sql
-- PROYECTO: Sistema de Cafetería CGAO (SENA)
-- DESCRIPCIÓN: Script DDL completo optimizado para Supabase (PostgreSQL 15+)
--              Incluye extensiones, automatización de perfiles, triggers,
--              funciones atómicas, RLS y políticas de seguridad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. CONFIGURACIÓN INICIAL Y EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. FUNCIONES AUXILIARES GLOBALES
-- -----------------------------------------------------------------------------

-- Función para actualizar automáticamente el campo 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. TABLA DE PERFILES DE USUARIO Y TRIGGER DE AUTENTICACIÓN
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    documento BIGINT UNIQUE NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' 
        CONSTRAINT check_profiles_rol CHECK (rol IN ('admin', 'cajero', 'despachador', 'auditor', 'cliente')),
    ficha INT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_documento ON public.profiles(documento);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at en profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Función con SECURITY DEFINER para crear el perfil automáticamente al registrar un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        nombre,
        rol,
        documento,
        ficha
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Registrado'),
        COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
        (NEW.raw_user_meta_data->>'documento')::BIGINT,
        (NEW.raw_user_meta_data->>'ficha')::INT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sobre auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. TABLAS LEGADAS DE GESTIÓN Y OPERACIÓN INTERNA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."admin" (
    documento BIGINT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(256) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    rol VARCHAR(20) NOT NULL CONSTRAINT check_admin_rol CHECK (rol IN ('admin', 'superadmin')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cliente (
    documento BIGINT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ficha INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.personal (
    docpersonal BIGINT PRIMARY KEY,
    nombre VARCHAR(50) NULL,
    clave VARCHAR(255) NULL,
    email VARCHAR(120) NULL,
    rol VARCHAR(15) NULL CONSTRAINT check_personal_rol CHECK (rol IN ('cajero', 'despachador', 'auditor')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. TABLA DE PRODUCTOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.producto (
    idproducto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    precio INT NOT NULL CONSTRAINT check_precio_positivo CHECK (precio >= 0),
    stock INT NOT NULL CONSTRAINT check_stock_positivo CHECK (stock >= 0),
    imagen VARCHAR(255) NULL,
    stock_minimo INT NOT NULL DEFAULT 5 CONSTRAINT check_stock_minimo_positivo CHECK (stock_minimo >= 0),
    costo INT NOT NULL DEFAULT 0 CONSTRAINT check_costo_positivo CHECK (costo >= 0),
    categoria VARCHAR(30) NULL,
    subcategoria VARCHAR(30) NULL,
    descripcion VARCHAR(300) NULL,
    es_especial BOOLEAN NOT NULL DEFAULT FALSE,
    especial_hasta DATE NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_producto_activo ON public.producto USING btree (activo);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON public.producto USING btree (categoria);

DROP TRIGGER IF EXISTS set_producto_updated_at ON public.producto;
CREATE TRIGGER set_producto_updated_at
    BEFORE UPDATE ON public.producto
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 5. TABLA DE VENTAS Y DETALLES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venta (
    idventa SERIAL PRIMARY KEY,
    precio INT NOT NULL DEFAULT 0 CONSTRAINT check_venta_precio_positivo CHECK (precio >= 0),
    cliente BIGINT NOT NULL REFERENCES public.cliente(documento) ON DELETE RESTRICT,
    fechaventa TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    estado VARCHAR(30) NOT NULL CONSTRAINT check_venta_estado CHECK (estado IN ('Pendiente de Pago', 'Pagado', 'En Preparacion', 'Listo para Entrega', 'Entregado', 'Cancelado')),
    metodo_pago VARCHAR(20) NULL CONSTRAINT check_venta_metodo_pago CHECK (metodo_pago IN ('Efectivo', 'Nequi', 'Bancolombia', 'Saldo')),
    numero_pedido_diario INT NULL,
    referencia_pasarela VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_cliente ON public.venta USING btree (cliente);
CREATE INDEX IF NOT EXISTS idx_venta_estado ON public.venta USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_venta_fechaventa ON public.venta USING btree (fechaventa DESC);
CREATE INDEX IF NOT EXISTS idx_venta_referencia_pasarela ON public.venta USING btree (referencia_pasarela);

DROP TRIGGER IF EXISTS set_venta_updated_at ON public.venta;
CREATE TRIGGER set_venta_updated_at
    BEFORE UPDATE ON public.venta
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.detalleventa (
    iddetalle SERIAL PRIMARY KEY,
    idventa INT NOT NULL REFERENCES public.venta(idventa) ON DELETE CASCADE,
    idproducto INT NOT NULL REFERENCES public.producto(idproducto) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT check_detalleventa_cantidad CHECK (cantidad > 0),
    precio_unitario INT NOT NULL CONSTRAINT check_detalleventa_precio CHECK (precio_unitario >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detalleventa_idventa ON public.detalleventa USING btree (idventa);
CREATE INDEX IF NOT EXISTS idx_detalleventa_idproducto ON public.detalleventa USING btree (idproducto);

DROP TRIGGER IF EXISTS set_detalleventa_updated_at ON public.detalleventa;
CREATE TRIGGER set_detalleventa_updated_at
    BEFORE UPDATE ON public.detalleventa
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. TABLAS DE COMPRAS, INVENTARIOS Y REPORTES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.compra (
    idcompra SERIAL PRIMARY KEY,
    nombrevendedor VARCHAR(100) NOT NULL,
    precio INT NOT NULL CONSTRAINT check_compra_precio CHECK (precio >= 0),
    fechacompra TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    documentoadmin BIGINT NOT NULL REFERENCES public."admin"(documento) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compra_documentoadmin ON public.compra USING btree (documentoadmin);

DROP TRIGGER IF EXISTS set_compra_updated_at ON public.compra;
CREATE TRIGGER set_compra_updated_at
    BEFORE UPDATE ON public.compra
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.detallecompra (
    iddetallecompra SERIAL PRIMARY KEY,
    idcompra INT NOT NULL REFERENCES public.compra(idcompra) ON DELETE CASCADE,
    idproducto INT NOT NULL REFERENCES public.producto(idproducto) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT check_detallecompra_cantidad CHECK (cantidad > 0),
    subtotal INT NOT NULL DEFAULT 0 CONSTRAINT check_detallecompra_subtotal CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detallecompra_idcompra ON public.detallecompra USING btree (idcompra);
CREATE INDEX IF NOT EXISTS idx_detallecompra_idproducto ON public.detallecompra USING btree (idproducto);

DROP TRIGGER IF EXISTS set_detallecompra_updated_at ON public.detallecompra;
CREATE TRIGGER set_detallecompra_updated_at
    BEFORE UPDATE ON public.detallecompra
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.bajainventario (
    idbaja SERIAL PRIMARY KEY,
    idproducto INT NOT NULL REFERENCES public.producto(idproducto) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT check_baja_cantidad CHECK (cantidad > 0),
    motivo VARCHAR(255) NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    usuario_documento BIGINT NULL,
    usuario_tipo VARCHAR(20) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bajainventario_idproducto ON public.bajainventario USING btree (idproducto);

DROP TRIGGER IF EXISTS set_bajainventario_updated_at ON public.bajainventario;
CREATE TRIGGER set_bajainventario_updated_at
    BEFORE UPDATE ON public.bajainventario
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.reporte (
    idreporte SERIAL PRIMARY KEY,
    idadmin BIGINT NOT NULL REFERENCES public."admin"(documento) ON DELETE RESTRICT,
    descripcion VARCHAR(255) NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    producto INT NOT NULL REFERENCES public.producto(idproducto) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reporte_idadmin ON public.reporte USING btree (idadmin);
CREATE INDEX IF NOT EXISTS idx_reporte_producto ON public.reporte USING btree (producto);

DROP TRIGGER IF EXISTS set_reporte_updated_at ON public.reporte;
CREATE TRIGGER set_reporte_updated_at
    BEFORE UPDATE ON public.reporte
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. TABLAS DE SEGURIDAD, AUDITORÍA Y SEGREGACIÓN
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tokenpedido (
    idtoken SERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    documento_cliente BIGINT NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokenpedido_documento ON public.tokenpedido USING btree (documento_cliente);

DROP TRIGGER IF EXISTS set_tokenpedido_updated_at ON public.tokenpedido;
CREATE TRIGGER set_tokenpedido_updated_at
    BEFORE UPDATE ON public.tokenpedido
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.tokenrecuperacion (
    idtoken SERIAL PRIMARY KEY,
    tipo_cuenta VARCHAR(10) NOT NULL CONSTRAINT check_token_tipo CHECK (tipo_cuenta IN ('admin', 'personal', 'cliente')),
    identificador BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    creado TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expira TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS set_tokenrecuperacion_updated_at ON public.tokenrecuperacion;
CREATE TRIGGER set_tokenrecuperacion_updated_at
    BEFORE UPDATE ON public.tokenrecuperacion
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.registroauditoria (
    idregistro SERIAL PRIMARY KEY,
    usuario VARCHAR(150) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(150) NULL,
    detalle VARCHAR(500) NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registroauditoria_timestamp ON public.registroauditoria USING btree ("timestamp" DESC);

CREATE TABLE IF NOT EXISTS public.solicitudsupresion (
    idsolicitud SERIAL PRIMARY KEY,
    documento_cliente BIGINT NOT NULL,
    nombre_cliente VARCHAR(100) NULL,
    motivo VARCHAR(500) NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CONSTRAINT check_supresion_estado CHECK (estado IN ('Pendiente', 'Procesada', 'Rechazada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS set_solicitudsupresion_updated_at ON public.solicitudsupresion;
CREATE TRIGGER set_solicitudsupresion_updated_at
    BEFORE UPDATE ON public.solicitudsupresion
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.solicitud_eliminacion_datos (
    id SERIAL PRIMARY KEY,
    documento_cliente INT NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente' NOT NULL CONSTRAINT check_elim_datos_estado CHECK (estado IN ('Pendiente', 'Procesada', 'Rechazada')),
    fecha_procesada TIMESTAMP WITH TIME ZONE NULL,
    procesado_por INT NULL,
    notas VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS set_solicitud_eliminacion_datos_updated_at ON public.solicitud_eliminacion_datos;
CREATE TRIGGER set_solicitud_eliminacion_datos_updated_at
    BEFORE UPDATE ON public.solicitud_eliminacion_datos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

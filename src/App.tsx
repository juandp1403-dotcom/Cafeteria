import React, { useState, useEffect } from 'react';
import { 
  ScreenView, 
  UserRole, 
  UserAprendiz, 
  AppUser, 
  CartItem, 
  ProductItem, 
  Order, 
  OrderStatus,
  BajaItem,
  AuditLog
} from './types';
import { INITIAL_PRODUCTS } from './data/catalog';
import { INITIAL_USERS } from './data/users';
import { INITIAL_BAJAS } from './data/bajas';
import { INITIAL_AUDIT_LOGS } from './data/auditLogs';
import { 
  fetchProductsFromSupabase, 
  fetchBajasFromSupabase
} from './lib/supabase';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IdentificacionScreen } from './components/IdentificacionScreen';
import { AccesoPersonalScreen } from './components/AccesoPersonalScreen';
import { CatalogoScreen } from './components/CatalogoScreen';
import { MiTurnoScreen } from './components/MiTurnoScreen';
import { CajaPOSScreen } from './components/CajaPOSScreen';
import { DespachoScreen } from './components/DespachoScreen';
import { MetricasScreen } from './components/MetricasScreen';
import { InventarioScreen } from './components/InventarioScreen';
import { UsuariosScreen } from './components/UsuariosScreen';
import { AuditoriaScreen } from './components/AuditoriaScreen';
import { ReceiptModal } from './components/ReceiptModal';
import { soundEngine } from './utils/sound';
import { ShieldAlert, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenView>('identificacion');
  const [role, setRole] = useState<UserRole>('Admin');
  const [staffName, setStaffName] = useState<string>('Carlos Mendoza (Admin)');
  const [staffEmail, setStaffEmail] = useState<string>('admin@sena.edu.co');

  // Master product catalog state (shared between Catalogo, Caja POS, Inventario, and Métricas)
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);

  // Master user accounts state (managed in UsuariosScreen)
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);

  // Bajas & Mermas State (Managed in InventarioScreen, updated weekly)
  const [bajas, setBajas] = useState<BajaItem[]>(INITIAL_BAJAS);

  // Audit Logs State (Staff actions only, strictly excludes client orders)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Synchronize with remote catalog and records on mount
  useEffect(() => {
    // 1. Fetch live products from remote catalog
    fetchProductsFromSupabase().then((remoteProds) => {
      if (remoteProds && remoteProds.length > 0) {
        setProducts(remoteProds);
      }
    });

    // 2. Fetch live bajas records
    fetchBajasFromSupabase().then((remoteBajas) => {
      if (remoteBajas && remoteBajas.length > 0) {
        setBajas(remoteBajas);
      }
    });
  }, []);

  // Apprentice User Profile for Kiosko
  const [user, setUser] = useState<UserAprendiz>({
    documento: '1020304050',
    tipoDoc: 'C.C. Cédula',
    nombre: 'Juan Carlos Pérez Gómez',
    ficha: '2671234',
    programa: 'ADSO / Análisis y Desarrollo de Software',
    jornada: 'Jornada Diurna 06:00 - 13:00',
    turnoAlmuerzo: 'Turno de Almuerzo Bloque B - 12:15',
    saldoMonedero: 35000,
    subsidioActivo: true,
    verificado: true,
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: INITIAL_PRODUCTS[0], // Empanada de Carne ($3.500)
      cantidad: 1,
    },
    {
      product: INITIAL_PRODUCTS[2], // Jugo de Naranja 16oz ($4.000)
      cantidad: 1,
    },
  ]);

  // Active Order matching Turno #042
  const [activeOrder, setActiveOrder] = useState<Order>({
    id: 'ord-042',
    numeroTurno: '#042',
    fecha: '18 Oct, 2026',
    hora: '12:42 PM',
    timestamp: Date.now(),
    cliente: {
      nombre: 'Juan Carlos Pérez Gómez',
      documento: '1.020.304.050',
      ficha: '2671234',
      programa: 'ADSO CGAO',
    },
    items: [
      {
        nombre: 'Almuerzo Ejecutivo SENA',
        descripcion: 'Pechuga grille + Arroz finas hierbas + Ensalada fresca',
        cantidad: 1,
        precioUnitario: 11500,
        total: 11500,
      },
      {
        nombre: 'Jugo de Naranja 16oz',
        descripcion: 'Bajo en azúcar • 14oz',
        cantidad: 1,
        precioUnitario: 4000,
        total: 4000,
      },
      {
        nombre: 'Porción Torta de Zanahoria',
        descripcion: 'Repostería CGAO',
        cantidad: 1,
        precioUnitario: 3200,
        total: 3200,
      },
    ],
    metodoPago: 'Billetera Digital SENA',
    subtotal: 18700,
    descuento: 2805,
    total: 15895,
    estado: 'en_preparacion',
    faseActual: 2,
    tiempoEstimadoMin: 4,
    idVenta: '#VTA-984210',
    mesaKiosko: 'Kiosko A-01',
    codigoQR: 'CGAO-VELEZ-984210',
    codigoBarras: '9842-1042-SENA',
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Cart operations
  const handleAddToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { product, cantidad: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleConfirmOrder = (paymentMethod: 'Billetera Digital SENA' | 'Efectivo' | 'Nequi' | 'Datáfono') => {
    const subtotal = cart.reduce((acc, item) => acc + item.product.precio * item.cantidad, 0);
    const descuento = 0;
    const total = subtotal;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      numeroTurno: '#042',
      fecha: new Date().toLocaleDateString('es-CO'),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      cliente: {
        nombre: user.nombre,
        documento: user.documento,
        ficha: user.ficha,
        programa: user.programa,
      },
      items: cart.map((item) => ({
        nombre: item.product.nombre,
        descripcion: item.product.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.product.precio,
        total: item.product.precio * item.cantidad,
      })),
      metodoPago: paymentMethod,
      subtotal,
      descuento,
      total,
      estado: 'en_preparacion',
      faseActual: 2,
      tiempoEstimadoMin: 4,
      idVenta: `#VTA-${Math.floor(100000 + Math.random() * 900000)}`,
      mesaKiosko: 'Kiosko A-01',
      codigoQR: `CGAO-${Date.now()}`,
      codigoBarras: '9842-1042-SENA',
    };

    setActiveOrder(newOrder);
    soundEngine.playCafeteriaBell();
    setCurrentScreen('mi_turno');
  };

  const handleAdvanceState = (newStatus: OrderStatus) => {
    setActiveOrder((prev) => ({
      ...prev,
      estado: newStatus,
      faseActual:
        newStatus === 'pago_confirmado' ? 1 :
        newStatus === 'en_preparacion' ? 2 :
        newStatus === 'listo_recoger' ? 3 : 4,
    }));
  };

  // Login handler from AccesoPersonalScreen
  const handleLoginSuccess = (newRole: UserRole, email: string, name: string) => {
    setRole(newRole);
    setStaffEmail(email);
    setStaffName(name);

    // Direct user to the primary view of their role
    switch (newRole) {
      case 'Admin':
        setCurrentScreen('inventario');
        break;
      case 'Cajero':
        setCurrentScreen('caja_pos');
        break;
      case 'Despachador':
        setCurrentScreen('despacho');
        break;
      case 'Auditor':
        setCurrentScreen('metricas');
        break;
      default:
        setCurrentScreen('catalogo');
        break;
    }
  };

  // Staff Audit Log Recorder (Captures staff modifications only, excludes client actions)
  const addStaffAuditLog = (
    modulo: 'Inventario' | 'Precios' | 'Bajas' | 'Caja POS' | 'Usuarios' | 'Despacho',
    accion: string,
    detalle: string,
    tipo: 'creacion' | 'edicion' | 'eliminacion' | 'baja' | 'ajuste' | 'seguridad' = 'edicion'
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fecha: new Date().toLocaleDateString('es-CO'),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      usuario: staffName,
      email: staffEmail,
      rol: role,
      modulo,
      accion,
      detalle,
      tipo,
      ip: '192.168.10.15 (Terminal Personal)',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Product CRUD
  const handleAddProduct = (newProd: ProductItem) => {
    setProducts((prev) => [newProd, ...prev]);

    addStaffAuditLog(
      'Inventario',
      'Alta de Nuevo Producto en Catálogo',
      `Se dio de alta "${newProd.nombre}" con stock inicial de ${newProd.stock} u y precio venta de $${newProd.precio.toLocaleString('es-CO')} COP.`,
      'creacion'
    );
  };

  const handleUpdateProduct = (updated: ProductItem) => {
    const existing = products.find((p) => p.id === updated.id);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    let modulo: 'Inventario' | 'Precios' = 'Inventario';
    let tipo: 'edicion' | 'ajuste' = 'edicion';
    let detalle = `Modificación de atributos en "${updated.nombre}".`;

    if (existing && existing.precio !== updated.precio) {
      modulo = 'Precios';
      detalle = `Actualización de tarifa en "${updated.nombre}": de $${existing.precio.toLocaleString('es-CO')} a $${updated.precio.toLocaleString('es-CO')} COP.`;
    } else if (existing && existing.stock !== updated.stock) {
      tipo = 'ajuste';
      detalle = `Ajuste manual de stock en "${updated.nombre}": de ${existing.stock} u a ${updated.stock} u (${updated.stock - existing.stock >= 0 ? '+' : ''}${updated.stock - existing.stock} u).`;
    }

    addStaffAuditLog(modulo, `Actualización de ${updated.nombre}`, detalle, tipo);
  };

  const handleDeleteProduct = (productId: string) => {
    const existing = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    addStaffAuditLog(
      'Inventario',
      'Eliminación Definitiva de Producto',
      `Se eliminó del catálogo de inventario la referencia "${existing?.nombre || productId}".`,
      'eliminacion'
    );
  };

  // Batch import products via Excel
  const handleImportProducts = (imported: ProductItem[]) => {
    setProducts((prev) => [...imported, ...prev]);

    addStaffAuditLog(
      'Inventario',
      'Carga Masiva de Catálogo vía Excel',
      `Se importaron e incorporaron ${imported.length} productos al inventario institucional CGAO.`,
      'creacion'
    );
  };

  // Bajas / Mermas Handler
  const handleAddBaja = (newBaja: BajaItem) => {
    setBajas((prev) => [newBaja, ...prev]);

    addStaffAuditLog(
      'Bajas',
      'Registro de Baja de Insumo por Merma/Vencimiento',
      `Descargo de ${newBaja.cantidad} u de "${newBaja.productoNombre}" por motivo: "${newBaja.motivo}". Pérdida al costo: $${newBaja.costoTotal.toLocaleString('es-CO')} COP. ${newBaja.observaciones ? `(${newBaja.observaciones})` : ''}`,
      'baja'
    );
  };

  // User CRUD
  const handleAddUser = (newUser: AppUser) => {
    setUsers((prev) => [newUser, ...prev]);
    addStaffAuditLog(
      'Usuarios',
      'Creación de Cuenta de Usuario',
      `Alta de usuario "${newUser.nombre}" con rol ${newUser.rol} y documento ${newUser.documento}.`,
      'creacion'
    );
  };

  const handleUpdateUser = (updated: AppUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    addStaffAuditLog(
      'Usuarios',
      'Modificación de Datos de Usuario',
      `Actualización de perfil / saldo de "${updated.nombre}" (${updated.documento}). Saldo monedero: $${updated.saldoMonedero.toLocaleString('es-CO')} COP.`,
      'edicion'
    );
  };

  const handleDeleteUser = (userId: string) => {
    const existing = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addStaffAuditLog(
      'Usuarios',
      'Desactivación de Usuario',
      `Eliminación del sistema del usuario "${existing?.nombre || userId}".`,
      'eliminacion'
    );
  };

  // RBAC Permission Check
  const isAuthorized = (screen: ScreenView, userRole: UserRole): boolean => {
    switch (screen) {
      case 'identificacion':
      case 'acceso_personal':
        return true;
      case 'catalogo':
      case 'mi_turno':
        return true; // All can view or test orders
      case 'caja_pos':
        return ['Admin', 'Cajero', 'Auditor'].includes(userRole);
      case 'despacho':
        return ['Admin', 'Despachador', 'Cajero', 'Auditor'].includes(userRole);
      case 'metricas':
        return ['Admin', 'Auditor'].includes(userRole);
      case 'inventario':
        return ['Admin', 'Auditor'].includes(userRole);
      case 'usuarios':
        return ['Admin', 'Auditor'].includes(userRole);
      case 'auditoria':
        return ['Admin', 'Auditor'].includes(userRole);
      default:
        return true;
    }
  };

  const hasAccess = isAuthorized(currentScreen, role);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#dfe2ef] flex flex-col selection:bg-[#39a900]/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient background light leaks */}
      <div className="fixed top-0 left-1/4 w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[36rem] h-[36rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Global Header */}
      <Header
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        role={role}
        onRoleChange={setRole}
        user={user}
        staffName={staffName}
        staffEmail={staffEmail}
        activeOrderCount={1}
      />

      {/* Main Screen Content */}
      <main className="flex-1 w-full pb-10">
        {/* If user lacks role authorization for this specific screen, show access gate */}
        {!hasAccess ? (
          <div className="max-w-md mx-auto my-16 p-6 glass-panel-elevated rounded-2xl border border-amber-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-display">
              Acceso Restringido por Rol (RBAC)
            </h3>
            <p className="text-xs text-slate-300">
              Esta sección requiere permisos de personal ({currentScreen.replace('_', ' ').toUpperCase()}). Tu rol actual es <span className="font-bold text-indigo-300">{role}</span>.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setCurrentScreen('acceso_personal')}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Lock className="w-4 h-4" />
                <span>Iniciar Sesión como Personal</span>
              </button>
              <button
                onClick={() => setCurrentScreen('catalogo')}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Volver al Menú de Aprendices
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentScreen === 'identificacion' && (
              <IdentificacionScreen
                user={user}
                onUpdateUser={setUser}
                onStartOrder={() => setCurrentScreen('catalogo')}
                onGoToAccesoPersonal={() => setCurrentScreen('acceso_personal')}
              />
            )}

            {currentScreen === 'acceso_personal' && (
              <AccesoPersonalScreen
                users={users}
                onLoginSuccess={handleLoginSuccess}
                onBackToAprendiz={() => {
                  setRole('Cliente');
                  setCurrentScreen('identificacion');
                }}
              />
            )}

            {currentScreen === 'catalogo' && (
              <CatalogoScreen
                user={user}
                products={products}
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveFromCart={handleRemoveFromCart}
                onConfirmOrder={handleConfirmOrder}
              />
            )}

            {currentScreen === 'mi_turno' && (
              <MiTurnoScreen
                order={activeOrder}
                onNewOrder={() => setCurrentScreen('catalogo')}
                onOpenReceipt={() => setShowReceiptModal(true)}
                onAdvanceState={handleAdvanceState}
              />
            )}

            {currentScreen === 'caja_pos' && (
              <CajaPOSScreen
                products={products}
                userRole={role}
                onPrintTicket={() => setShowReceiptModal(true)}
              />
            )}

            {currentScreen === 'despacho' && (
              <DespachoScreen userRole={role} />
            )}

            {currentScreen === 'metricas' && (
              <MetricasScreen products={products} />
            )}

            {currentScreen === 'inventario' && (
              <InventarioScreen
                products={products}
                userRole={role}
                staffName={staffName}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                bajas={bajas}
                onAddBaja={handleAddBaja}
                onImportProducts={handleImportProducts}
              />
            )}

            {currentScreen === 'usuarios' && (
              <UsuariosScreen
                users={users}
                userRole={role}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {currentScreen === 'auditoria' && (
              <AuditoriaScreen
                auditLogs={auditLogs}
                userRole={role}
                staffName={staffName}
              />
            )}
          </>
        )}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Printable Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          order={activeOrder}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { POSOrder, ProductItem, UserRole } from '../types';
import { INITIAL_POS_ORDERS, RECENT_PAID_ORDERS } from '../data/posOrders';
import { 
  Search, 
  Wallet, 
  Check, 
  X, 
  Printer, 
  CreditCard, 
  Banknote, 
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  PackageX,
  Calendar,
  Layers,
  Download,
  ShieldAlert
} from 'lucide-react';
import { soundEngine } from '../utils/sound';
import { exportSalesReport, ExportSalesItem } from '../utils/exportExcel';

interface CajaPOSScreenProps {
  products: ProductItem[];
  userRole?: UserRole;
  onPrintTicket?: (orderId: string) => void;
}

export const CajaPOSScreen: React.FC<CajaPOSScreenProps> = ({ 
  products, 
  userRole = 'Cajero', 
  onPrintTicket 
}) => {
  const [orders, setOrders] = useState<POSOrder[]>(INITIAL_POS_ORDERS);
  const [recentPaid, setRecentPaid] = useState(RECENT_PAID_ORDERS);
  const [recaudoManana, setRecaudoManana] = useState(485000);
  const [efectivoEnCaja, setEfectivoEnCaja] = useState(245000);
  const [digitalTarjeta, setDigitalTarjeta] = useState(240000);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'todos' | 'efectivo' | 'nequi' | 'datafono'>('todos');
  
  // Date period filter requested: hoy / semana / mes
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes'>('hoy');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isReadOnly = userRole === 'Auditor';

  // Products metrics requested:
  // "cambia el tiempo promedio de transaccion por productos agotados, el canal websoccket pos por un productos en alerta amarilla"
  const productosAgotados = useMemo(() => {
    return products.filter((p) => p.stock === 0 || p.agotado);
  }, [products]);

  const productosAlertaAmarilla = useMemo(() => {
    return products.filter((p) => p.stock > 0 && p.stock <= (p.alertaStock || 8));
  }, [products]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCharge = (order: POSOrder) => {
    if (isReadOnly) {
      showToast('Modo Auditor: No tienes permisos para alterar cobros.');
      return;
    }

    soundEngine.playCashRegisterBeep();
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, estado: 'cobrado' as const } : o)));

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    
    setRecentPaid((prev) => [
      {
        id: `rec-${order.numeroTurno}`,
        turno: order.numeroTurno,
        nombre: order.clienteNombre,
        hora: timeStr,
        metodo: order.metodoPago,
        total: order.total,
        fecha: 'Hoy',
      },
      ...prev,
    ]);

    setRecaudoManana((prev) => prev + order.total);
    if (order.metodoPago === 'Efectivo') {
      setEfectivoEnCaja((prev) => prev + order.total);
    } else {
      setDigitalTarjeta((prev) => prev + order.total);
    }

    showToast(`Cobro registrado: ${order.numeroTurno} (${order.clienteNombre}) - $${order.total.toLocaleString('es-CO')} COP`);
  };

  const handleCancel = (orderId: string) => {
    if (isReadOnly) {
      showToast('Modo Auditor: No tienes permisos para anular órdenes.');
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, estado: 'anulado' as const } : o)));
    showToast('Orden marcada como anulada en el módulo de caja.');
  };

  // Filter orders by date & search & payment method
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Period filter
      if (dateFilter === 'hoy') {
        if (ord.fecha && ord.fecha !== 'Hoy') return false;
      } else if (dateFilter === 'semana') {
        if (ord.fecha === 'Este Mes') return false;
      }
      // 'mes' shows everything

      // Search match
      const matchSearch =
        ord.numeroTurno.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.documento.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.ficha.toLowerCase().includes(searchQuery.toLowerCase());

      // Payment method match
      const matchMethod =
        selectedMethod === 'todos' ||
        (selectedMethod === 'efectivo' && ord.metodoPago === 'Efectivo') ||
        (selectedMethod === 'nequi' && ord.metodoPago === 'Nequi') ||
        (selectedMethod === 'datafono' && ord.metodoPago === 'Datáfono');

      return matchSearch && matchMethod;
    });
  }, [orders, dateFilter, searchQuery, selectedMethod]);

  // Excel export functions
  const handleExportExcel = (period: 'dia' | 'semana_laboral') => {
    const listToExport: ExportSalesItem[] = orders
      .filter((o) => {
        if (period === 'dia') return !o.fecha || o.fecha === 'Hoy';
        // semana laboral: includes all except old month items
        return o.fecha !== 'Este Mes';
      })
      .map((o) => ({
        id: o.id,
        numeroTurno: o.numeroTurno,
        fecha: o.fecha || '2026-03-09',
        hora: o.tiempoRelativo || '10:30 AM',
        clienteNombre: o.clienteNombre,
        documento: o.documento,
        ficha: o.ficha,
        programa: o.programa,
        metodoPago: o.metodoPago,
        itemsDescripcion: o.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', '),
        total: o.total,
        estado: o.estado.toUpperCase(),
      }));

    const title = period === 'dia' ? 'Ventas del Día (Hoy)' : 'Ventas Semana Laboral (Lunes a Viernes)';
    exportSalesReport(title, listToExport, period);
    setShowExportMenu(false);
    showToast(`Archivo Excel exportado exitosamente (${title}).`);
  };

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel-elevated bg-[#152438]/95 border border-indigo-500/50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#39a900]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider text-[#39a900] uppercase font-display">
              MÓDULO DE RECAUDO & CAJA POS
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Centro CGAO Vélez • Regional Santander 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Terminal POS Mostrador
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Control de cobros presenciales, validación de pago en efectivo y digital, y conciliación de turno de caja.
          </p>
        </div>

        {/* Action button: Descargar información en Excel */}
        <div className="relative flex items-center gap-2">
          {isReadOnly && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Modo Auditor (Solo Lectura)</span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-[0_0_15px_rgba(57,169,0,0.4)] transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar Ventas en Excel</span>
              <Download className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Dropdown with options: día and semana laboral */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 glass-panel-elevated rounded-xl border border-white/20 shadow-2xl p-2 z-50 space-y-1 bg-[#101726]">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                  Seleccionar Periodo de Reporte:
                </div>
                <button
                  onClick={() => handleExportExcel('dia')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-white hover:bg-emerald-950/60 hover:text-emerald-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Por Día (Ventas de Hoy)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">.csv / xlsx</span>
                </button>
                <button
                  onClick={() => handleExportExcel('semana_laboral')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-white hover:bg-indigo-950/60 hover:text-indigo-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Semana Laboral (Lun - Vie)</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">.csv / xlsx</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Changed according to user requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Recaudo Turno */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              RECAUDO TOTAL TURNO
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[#39a900]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-display">
              ${recaudoManana.toLocaleString('es-CO')}
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Efectivo: ${efectivoEnCaja.toLocaleString('es-CO')}</span>
              <span>Digital: ${digitalTarjeta.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pedidos Pendientes */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ÓRDENES PENDIENTES COBRO
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
              {orders.filter((o) => o.estado === 'pendiente').length} activas
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-400 font-display">
              {orders.filter((o) => o.estado === 'pendiente').length}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Esperando cobro en caja mostrador
            </p>
          </div>
        </div>

        {/* Card 3: PRODUCTOS AGOTADOS (Replaced Tiempo Promedio) */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">
              PRODUCTOS AGOTADOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400 font-display">
                {productosAgotados.length}
              </span>
              <span className="text-xs text-red-300 font-medium">sin existencia</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {productosAgotados.length > 0
                ? productosAgotados.map((p) => p.nombre).join(', ')
                : 'Inventario abastecido'}
            </p>
          </div>
        </div>

        {/* Card 4: PRODUCTOS EN ALERTA AMARILLA (Replaced Canal WebSocket) */}
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              ALERTA AMARILLA (STOCK BAJO)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-display">
                {productosAlertaAmarilla.length}
              </span>
              <span className="text-xs text-amber-300 font-medium">críticos</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {productosAlertaAmarilla.length > 0
                ? productosAlertaAmarilla.map((p) => `${p.nombre} (${p.stock})`).join(', ')
                : 'Ninguno en nivel crítico'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter Tabs Requested: Hoy / Semana / Mes + Search + Payment Filter */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Buttons for Pedidos Hoy, Semana, Mes */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0c121e] rounded-xl border border-white/10">
          <button
            onClick={() => setDateFilter('hoy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dateFilter === 'hoy'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Pedidos de Hoy</span>
          </button>
          <button
            onClick={() => setDateFilter('semana')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dateFilter === 'semana'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>De la Semana</span>
          </button>
          <button
            onClick={() => setDateFilter('mes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dateFilter === 'mes'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Del Mes</span>
          </button>
        </div>

        {/* Right: Search & Payment filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar turno, aprendiz, doc..."
              className="w-full sm:w-56 bg-[#0c121e] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['todos', 'efectivo', 'nequi', 'datafono'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                  selectedMethod === m
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Grid & Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Orders List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-white font-display">
              Comandas Registradas ({filteredOrders.length})
            </h3>
            <span className="text-xs text-slate-400">
              Filtro actual: <strong className="text-indigo-300 capitalize">{dateFilter}</strong>
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-white">No hay órdenes para este filtro</h4>
              <p className="text-xs text-slate-500">
                Cambia el periodo temporal o verifica los términos de búsqueda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => {
                const isPaid = ord.estado === 'cobrado';
                const isCancelled = ord.estado === 'anulado';

                return (
                  <div
                    key={ord.id}
                    className={`glass-card rounded-2xl p-4 sm:p-5 border transition-all ${
                      isPaid
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : isCancelled
                        ? 'border-red-500/20 bg-red-950/10 opacity-60'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl font-black text-white font-display">
                          {ord.numeroTurno}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white">
                              {ord.clienteNombre}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                              {ord.tipoUsuario || 'Aprendiz'}
                            </span>
                            {ord.fecha && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                                {ord.fecha}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Doc: {ord.documento} • Ficha {ord.ficha} • {ord.programa}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#141e30] border border-white/10 text-slate-300 flex items-center gap-1.5">
                          {ord.metodoPago === 'Efectivo' && <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                          {ord.metodoPago === 'Nequi' && <Wallet className="w-3.5 h-3.5 text-purple-400" />}
                          {ord.metodoPago === 'Datáfono' && <CreditCard className="w-3.5 h-3.5 text-indigo-400" />}
                          {ord.metodoPago}
                        </span>

                        <span className="text-lg font-black text-[#39a900] font-display">
                          ${ord.total.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="py-3 text-xs text-slate-300 space-y-1">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.cantidad}x {it.nombre} {it.nota && <span className="text-amber-300 italic">({it.nota})</span>}
                          </span>
                          <span className="font-semibold text-slate-400">
                            ${(it.precio * it.cantidad).toLocaleString('es-CO')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        {isPaid ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cobrado Exitosamente
                          </span>
                        ) : isCancelled ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Anulado
                          </span>
                        ) : (
                          <span>Tiempo en cola: {ord.tiempoRelativo}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onPrintTicket && (
                          <button
                            onClick={() => onPrintTicket(ord.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            title="Imprimir comanda POS"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isPaid && !isCancelled && !isReadOnly && (
                          <>
                            <button
                              onClick={() => handleCancel(ord.id)}
                              className="py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer"
                            >
                              Anular
                            </button>
                            <button
                              onClick={() => handleCharge(ord)}
                              className="py-1.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-[#39a900] text-white text-xs font-bold font-display flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Cobrar ${ord.total.toLocaleString('es-CO')}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Recent Paid Stream & Cash Box summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel-elevated rounded-2xl p-5 border border-white/15 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-extrabold text-white font-display">
                Últimos Cobros Registrados
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                Caja Activa
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {recentPaid.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#0c121e]/80 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{item.turno}</span>
                      <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                        {item.nombre}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {item.hora} • {item.metodo}
                    </span>
                  </div>
                  <span className="font-extrabold text-emerald-400 font-display">
                    +${item.total.toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block">
                Cierre de caja sincronizado con Tesorería Regional Santander
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { ProductItem, POSOrder } from '../types';
import { fetchVentasFromSupabase } from '../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  PackageX, 
  DollarSign, 
  Award, 
  ShieldCheck, 
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Clock,
  Download,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { downloadCSV } from '../utils/exportExcel';

interface MetricasScreenProps {
  products: ProductItem[];
}

export const MetricasScreen: React.FC<MetricasScreenProps> = ({ products }) => {
  const [activeChartTab, setActiveChartTab] = useState<'semana_dias' | 'meses_ano'>('semana_dias');
  const [ventas, setVentas] = useState<POSOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar ventas reales desde la base de datos Supabase
  useEffect(() => {
    let active = true;
    const loadVentas = () => {
      fetchVentasFromSupabase().then((data) => {
        if (active) {
          setVentas(data || []);
          setIsLoading(false);
        }
      });
    };
    loadVentas();
    const interval = setInterval(loadVentas, 25000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Products with zero stock
  const productosSinStock = useMemo(() => {
    return products.filter((p) => p.stock === 0 || p.agotado);
  }, [products]);

  // Products with low stock (alert threshold)
  const productosStockBajo = useMemo(() => {
    return products.filter((p) => p.stock <= (p.alertaStock || 8));
  }, [products]);

  // Cálculos dinámicos de ventas del día
  const ventasHoy = useMemo(() => {
    return ventas.filter((v) => v.fecha === 'Hoy');
  }, [ventas]);

  const pedidosDespachadosHoy = useMemo(() => {
    return ventasHoy.filter(
      (v) => v.estadoDb === 'Entregado' || v.estado === 'cobrado'
    ).length;
  }, [ventasHoy]);

  const totalVentasDia = useMemo(() => {
    return ventasHoy
      .filter((v) => v.estado !== 'pendiente' && v.estado !== 'anulado')
      .reduce((acc, v) => acc + v.total, 0);
  }, [ventasHoy]);

  const totalPedidosHoy = ventasHoy.length;

  const tasaCumplimiento = useMemo(() => {
    if (totalPedidosHoy === 0) return 100;
    return Math.round((pedidosDespachadosHoy / totalPedidosHoy) * 100);
  }, [pedidosDespachadosHoy, totalPedidosHoy]);

  // Chart Data 1: Ventas en la Semana Laboral (Lunes a Viernes) - Calculado con ventas reales
  const diasSemanaSales = useMemo(() => {
    const nombresDias = [
      { key: 1, dia: 'Lunes' },
      { key: 2, dia: 'Martes' },
      { key: 3, dia: 'Miércoles' },
      { key: 4, dia: 'Jueves' },
      { key: 5, dia: 'Viernes' },
    ];

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 5);

    const ventasSemana = ventas.filter((v) => {
      const d = new Date(v.timestamp);
      return d >= startOfWeek && d < endOfWeek;
    });

    const result = nombresDias.map(({ key, dia }) => {
      const ventasDelDia = ventasSemana.filter((v) => {
        const d = new Date(v.timestamp);
        return d.getDay() === key;
      });

      const monto = ventasDelDia
        .filter((v) => v.estado !== 'anulado')
        .reduce((acc, v) => acc + v.total, 0);
      const pedidos = ventasDelDia.length;

      const productCounts: Record<string, number> = {};
      ventasDelDia.forEach((v) => {
        (v.items || []).forEach((item) => {
          productCounts[item.nombre] = (productCounts[item.nombre] || 0) + item.cantidad;
        });
      });

      const topProdEntry = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
      const topProducto = topProdEntry
        ? `${topProdEntry[0]} (${topProdEntry[1]} u)`
        : 'Sin ventas';

      return {
        dia,
        monto,
        pedidos,
        topProducto,
      };
    });

    const maxMonto = Math.max(...result.map((d) => d.monto), 0);

    return result.map((item) => ({
      ...item,
      porcentaje: maxMonto > 0 && item.monto > 0 ? `${Math.max(12, Math.round((item.monto / maxMonto) * 100))}%` : '4%',
      esPico: maxMonto > 0 && item.monto === maxMonto,
    }));
  }, [ventas]);

  const totalVentasSemana = useMemo(() => diasSemanaSales.reduce((acc, d) => acc + d.monto, 0), [diasSemanaSales]);
  const totalPedidosSemana = useMemo(() => diasSemanaSales.reduce((acc, d) => acc + d.pedidos, 0), [diasSemanaSales]);
  const diaMayorVenta = useMemo(() => diasSemanaSales.find((d) => d.esPico) || diasSemanaSales[0], [diasSemanaSales]);

  // Chart Data 2: Ventas Mensuales del Año (12 Meses: Ene a Dic) - Calculado con ventas reales
  const mesesAnoSales = useMemo(() => {
    const mesesDef = [
      { mes: 'Ene', nombreCompleto: 'Enero' },
      { mes: 'Feb', nombreCompleto: 'Febrero' },
      { mes: 'Mar', nombreCompleto: 'Marzo' },
      { mes: 'Abr', nombreCompleto: 'Abril' },
      { mes: 'May', nombreCompleto: 'Mayo' },
      { mes: 'Jun', nombreCompleto: 'Junio' },
      { mes: 'Jul', nombreCompleto: 'Julio' },
      { mes: 'Ago', nombreCompleto: 'Agosto' },
      { mes: 'Sep', nombreCompleto: 'Septiembre' },
      { mes: 'Oct', nombreCompleto: 'Octubre' },
      { mes: 'Nov', nombreCompleto: 'Noviembre' },
      { mes: 'Dic', nombreCompleto: 'Diciembre' },
    ];

    const currentYear = new Date().getFullYear();

    const result = mesesDef.map((m, idx) => {
      const ventasDelMes = ventas.filter((v) => {
        const d = new Date(v.timestamp);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });

      const monto = ventasDelMes
        .filter((v) => v.estado !== 'anulado')
        .reduce((acc, v) => acc + v.total, 0);

      const raciones = ventasDelMes.reduce((acc, v) => {
        const itemsCount = (v.items || []).reduce((sum, it) => sum + it.cantidad, 0);
        return acc + (itemsCount || 1);
      }, 0);

      return {
        mes: m.mes,
        nombreCompleto: m.nombreCompleto,
        monto,
        raciones,
      };
    });

    const maxMonto = Math.max(...result.map((m) => m.monto), 0);

    return result.map((item) => ({
      ...item,
      porcentaje: maxMonto > 0 && item.monto > 0 ? `${Math.max(12, Math.round((item.monto / maxMonto) * 100))}%` : '4%',
      esPico: maxMonto > 0 && item.monto === maxMonto,
    }));
  }, [ventas]);

  const totalVentasAnual = useMemo(() => mesesAnoSales.reduce((acc, m) => acc + m.monto, 0), [mesesAnoSales]);
  const totalRacionesAnual = useMemo(() => mesesAnoSales.reduce((acc, m) => acc + m.raciones, 0), [mesesAnoSales]);
  const mesMayorVenta = useMemo(() => mesesAnoSales.find((m) => m.esPico) || mesesAnoSales[new Date().getMonth()], [mesesAnoSales]);

  // Top 15 productos más vendidos - Calculado a partir de las ventas reales
  const top15ProductosSemana = useMemo(() => {
    const agg: Record<string, { nombre: string; unidades: number; total: number; precio: number; categoria: string }> = {};

    ventas.forEach((v) => {
      if (v.estado === 'anulado') return;
      (v.items || []).forEach((it) => {
        const key = it.nombre.trim();
        const matchingProduct = products.find(
          (p) => p.nombre.toLowerCase().trim() === key.toLowerCase()
        );
        const categoria = matchingProduct?.categoriaLabel || 'Consumo CGAO';
        const precio = it.precio || matchingProduct?.precio || 0;

        if (!agg[key]) {
          agg[key] = {
            nombre: key,
            unidades: 0,
            total: 0,
            precio,
            categoria,
          };
        }
        agg[key].unidades += it.cantidad;
        agg[key].total += it.cantidad * precio;
      });
    });

    return Object.values(agg)
      .sort((a, b) => b.unidades - a.unidades || b.total - a.total)
      .slice(0, 15)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));
  }, [ventas, products]);

  const handleExportTop15 = () => {
    if (top15ProductosSemana.length === 0) {
      const rows = [
        ['RANKING TOP 15 PRODUCTOS MÁS VENDIDOS - CGAO VÉLEZ'],
        [`Fecha de corte: ${new Date().toLocaleDateString('es-CO')}`],
        [],
        ['Estado: No se registran ventas acumuladas en el sistema aún.'],
      ];
      downloadCSV('Top15_Productos_Semana_CGAO.csv', rows);
      return;
    }
    const rows = [
      ['RANKING TOP 15 PRODUCTOS MÁS VENDIDOS DE LA SEMANA - CGAO VÉLEZ 2026'],
      [`Fecha de corte: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['Puesto #', 'Nombre del Producto', 'Categoría', 'Unidades Vendidas', 'Precio Unitario (COP)', 'Ventas Totales (COP)'],
      ...top15ProductosSemana.map((p) => [
        p.rank,
        p.nombre,
        p.categoria,
        p.unidades,
        p.precio,
        p.total,
      ]),
    ];
    downloadCSV('Top15_Productos_Semana_CGAO.csv', rows);
  };

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold text-[#39a900] uppercase tracking-wider font-display">
              CENTRO CGAO VÉLEZ • GESTIÓN & RENDICIÓN DE CUENTAS
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[10px] text-slate-400">Regional Santander 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Métricas Operativas & Desempeño
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Supervisión analítica de pedidos entregados, volumen transaccional diario, inventario crítico y comparativas multi-año.
          </p>
        </div>

        <button
          onClick={handleExportTop15}
          className="self-start lg:self-auto py-2.5 px-4 rounded-xl bg-[#131d2e] hover:bg-[#1a273e] border border-white/10 text-white text-xs font-bold font-display flex items-center gap-2 transition-all cursor-pointer shadow-md"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exportar Ranking Top 15 (CSV)</span>
        </button>
      </div>

      {/* Top 4 KPI Cards - Adjusted strictly according to prompt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: PEDIDOS DESPACHADOS (Totalidad entregados hoy) */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">
              PEDIDOS DESPACHADOS (HOY)
            </span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-display">
            {pedidosDespachadosHoy}{' '}
            <span className="text-xs font-medium text-slate-400">entregados</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${totalPedidosHoy > 0 ? Math.min(100, Math.round((pedidosDespachadosHoy / totalPedidosHoy) * 100)) : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
            {totalPedidosHoy > 0
              ? `${Math.round((pedidosDespachadosHoy / totalPedidosHoy) * 100)}% de órdenes entregadas hoy (${pedidosDespachadosHoy}/${totalPedidosHoy})`
              : 'Sin pedidos pendientes por entregar hoy'}
          </span>
        </div>

        {/* Card 2: TOTAL VENTAS DÍA */}
        <div className="glass-card rounded-2xl p-4 border border-indigo-500/20 bg-indigo-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
              TOTAL VENTAS DÍA
            </span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white font-display">
            ${totalVentasDia.toLocaleString('es-CO')}{' '}
            <span className="text-xs font-medium text-slate-300">COP</span>
          </div>
          <span className="text-[10px] text-indigo-300 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {totalPedidosHoy} transacciones registradas hoy
          </span>
        </div>

        {/* Card 3: PRODUCTOS SIN STOCK */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold text-red-300 uppercase tracking-wider text-[10px]">
              PRODUCTOS SIN STOCK
            </span>
            <PackageX className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400 font-display">
            {productosSinStock.length}{' '}
            <span className="text-xs font-medium text-slate-300">artículos</span>
          </div>
          <span className="text-[10px] text-red-300 mt-1 block truncate">
            {productosSinStock.length > 0
              ? `Requiere reabastecimiento: ${productosSinStock.map((p) => p.nombre).join(', ')}`
              : 'Existencias cubiertas al 100%'}
          </span>
        </div>

        {/* Card 4: Cumplimiento Operacional */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              CUMPLIMIENTO OPERACIONAL
            </span>
            <ShieldCheck className="w-4 h-4 text-[#39a900]" />
          </div>
          <div className="text-3xl font-black text-[#39a900] font-display">
            {tasaCumplimiento}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalPedidosHoy > 0
              ? `${pedidosDespachadosHoy} de ${totalPedidosHoy} órdenes despachadas a tiempo`
              : 'Operación institucional en línea y disponible'}
          </span>
        </div>
      </div>

      {/* Charts Section: Semana (Lunes a Viernes) y Mensuales del Año (12 Meses) */}
      <div className="glass-panel-elevated rounded-2xl p-6 border border-white/15 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white font-display">
                Comportamiento de Ventas & Rendimiento
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Operación CGAO 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificación clara del día pico de ventas en la semana y del mes de mayor rotación del año.
            </p>
          </div>

          {/* Toggle buttons for Semana (L-V) vs Mensuales del Año */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0c121e] rounded-xl border border-white/10">
            <button
              onClick={() => setActiveChartTab('semana_dias')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'semana_dias'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Semana (Lunes a Viernes)</span>
            </button>
            <button
              onClick={() => setActiveChartTab('meses_ano')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'meses_ano'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mensuales del Año (12 Meses)</span>
            </button>
          </div>
        </div>

        {/* Active Chart Display */}
        {activeChartTab === 'semana_dias' ? (
          <div className="space-y-4">
            {/* Header info bar for weekly view */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#0b1322] border border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-semibold">
                  Semana Laboral: <strong className="text-white">Lunes a Viernes</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">
                  Total Semana: <strong className="text-emerald-400 font-mono">${totalVentasSemana.toLocaleString('es-CO')} COP</strong> ({totalPedidosSemana} pedidos)
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[11px]">
                  {totalVentasSemana > 0
                    ? `Día con mayor venta: ${diaMayorVenta.dia} ($${(diaMayorVenta.monto / 1000000).toFixed(2)}M COP)`
                    : 'Día con mayor venta: N/A'}
                </span>
              </div>
            </div>

            {/* 5-Day Bars (Lunes a Viernes) */}
            <div className="h-64 flex items-end justify-around gap-2 sm:gap-6 pt-8 pb-3 border-b border-white/10">
              {diasSemanaSales.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                  {/* Badge for Day with highest sales */}
                  {item.esPico && (
                    <div className="absolute -top-6 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-extrabold flex items-center gap-1 shadow-lg animate-bounce">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>MAYOR VENTA</span>
                    </div>
                  )}

                  {/* Tooltip on hover / persistent figure */}
                  <div className={`text-center transition-all ${item.esPico ? 'scale-105' : 'group-hover:scale-105'}`}>
                    <div className={`text-xs font-mono font-bold ${item.esPico ? 'text-amber-300' : 'text-emerald-400'}`}>
                      ${(item.monto / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.pedidos} pedidos
                    </div>
                  </div>

                  {/* Bar column */}
                  <div
                    style={{ height: item.porcentaje }}
                    className={`w-full max-w-[84px] rounded-t-xl transition-all duration-300 ${
                      item.esPico
                        ? 'bg-gradient-to-t from-amber-950 via-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/50'
                        : 'bg-gradient-to-t from-indigo-950 via-indigo-600 to-emerald-500 hover:brightness-125 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                    }`}
                  />

                  {/* Day label */}
                  <div className="text-center pt-1">
                    <span className={`text-xs font-extrabold block ${item.esPico ? 'text-amber-300' : 'text-white'}`}>
                      {item.dia}
                    </span>
                    <span className="text-[9px] text-slate-400 hidden sm:block truncate max-w-[110px]" title={item.topProducto}>
                      Top: {item.topProducto}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom summary note */}
            <div className="text-center text-[11px] text-slate-400">
              {totalVentasSemana > 0 ? (
                <>
                  El <span className="text-white font-bold">{diaMayorVenta.dia}</span> concentra el{' '}
                  <span className="text-amber-400 font-bold">
                    {((diaMayorVenta.monto / totalVentasSemana) * 100).toFixed(1)}%
                  </span>{' '}
                  del total semanal con ${diaMayorVenta.monto.toLocaleString('es-CO')} COP recaudados.
                </>
              ) : (
                <span>Sin ventas registradas en la semana laboral actual.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info bar for 12-month year view */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#0b1322] border border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-semibold">
                  Consolidado Anual: <strong className="text-white">Año 2026 (12 Meses)</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">
                  Total Anual: <strong className="text-emerald-400 font-mono">${(totalVentasAnual / 1000000).toFixed(1)}M COP</strong> ({totalRacionesAnual.toLocaleString('es-CO')} raciones)
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[11px]">
                  {totalVentasAnual > 0
                    ? `Mes con mayor venta: ${mesMayorVenta.nombreCompleto} ($${(mesMayorVenta.monto / 1000000).toFixed(1)}M COP)`
                    : 'Mes con mayor venta: N/A'}
                </span>
              </div>
            </div>

            {/* 12-Month Bars (Enero a Diciembre) */}
            <div className="h-64 flex items-end justify-between gap-1 sm:gap-2.5 pt-8 pb-3 border-b border-white/10 overflow-x-auto">
              {mesesAnoSales.map((item, idx) => (
                <div key={idx} className="flex-1 min-w-[28px] sm:min-w-[44px] flex flex-col items-center gap-1.5 group h-full justify-end relative">
                  {/* Badge for Month with highest sales */}
                  {item.esPico && (
                    <div className="absolute -top-7 px-1.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/50 text-amber-300 text-[9px] font-black whitespace-nowrap shadow-lg">
                      ★ PICO ANUAL
                    </div>
                  )}

                  {/* Figure on top of bar */}
                  <div className="text-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className={`text-[10px] sm:text-[11px] font-mono font-bold block ${item.esPico ? 'text-amber-300' : 'text-emerald-400'}`}>
                      ${(item.monto / 1000000).toFixed(1)}M
                    </span>
                  </div>

                  {/* Bar column */}
                  <div
                    style={{ height: item.porcentaje }}
                    className={`w-full max-w-[38px] rounded-t-lg transition-all duration-300 ${
                      item.esPico
                        ? 'bg-gradient-to-t from-amber-950 via-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/60'
                        : 'bg-gradient-to-t from-slate-900 via-indigo-700 to-emerald-400 hover:brightness-125 shadow-sm'
                    }`}
                  />

                  {/* Month label */}
                  <div className="text-center pt-1">
                    <span className={`text-[11px] font-bold block ${item.esPico ? 'text-amber-300 font-extrabold' : 'text-slate-300'}`}>
                      {item.mes}
                    </span>
                    <span className="text-[9px] text-slate-500 hidden md:block">
                      {item.raciones} u
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom summary note */}
            <div className="text-center text-[11px] text-slate-400">
              {totalVentasAnual > 0 ? (
                <>
                  <span className="text-amber-400 font-bold">{mesMayorVenta.nombreCompleto}</span> registra el mayor volumen anual con{' '}
                  <span className="text-white font-bold">{mesMayorVenta.raciones.toLocaleString('es-CO')} raciones</span> (${mesMayorVenta.monto.toLocaleString('es-CO')} COP).
                </>
              ) : (
                <span>Sin transacciones consolidadas en el año fiscal {new Date().getFullYear()}.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Two Tables Requested: 
          1) Tabla de Productos con Stock Bajo
          2) Tabla de los 15 Productos Más Vendidos de la Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table 1: Productos con Stock Bajo (5 Cols) */}
        <div className="lg:col-span-5 glass-panel-elevated rounded-2xl p-5 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-extrabold text-white font-display">
                  Productos con Stock Bajo
                </h3>
                <span className="text-[10px] text-slate-400">
                  Alerta para reabastecimiento en cocina
                </span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
              {productosStockBajo.length} ítems
            </span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b101c] text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Producto</th>
                  <th className="py-2 px-2 text-center">Stock</th>
                  <th className="py-2 px-2 text-center">Mínimo</th>
                  <th className="py-2 px-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productosStockBajo.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No hay productos con stock crítico en este momento
                    </td>
                  </tr>
                ) : (
                  productosStockBajo.map((prod) => {
                    const isAgotado = prod.stock === 0;
                    return (
                      <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white text-xs">{prod.nombre}</div>
                          <div className="text-[10px] text-slate-400">{prod.categoriaLabel}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-xs">
                          <span className={isAgotado ? 'text-red-400' : 'text-amber-400'}>
                            {prod.stock} un.
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-xs">
                          {prod.alertaStock || 8} un.
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {isAgotado ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-950/80 text-red-400 border border-red-500/30 uppercase">
                              Agotado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 uppercase">
                              Alerta
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: 15 Productos Más Vendidos de la Semana (7 Cols) */}
        <div className="lg:col-span-7 glass-panel-elevated rounded-2xl p-5 border border-white/15 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#39a900]" />
              <div>
                <h3 className="text-sm font-extrabold text-white font-display">
                  15 Productos Más Vendidos de la Semana
                </h3>
                <span className="text-[10px] text-slate-400">
                  Ranking consolidado de preferencias en el Centro CGAO Vélez
                </span>
              </div>
            </div>

            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
              Semana Actual 2026
            </span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b101c] text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-2 text-center">#</th>
                  <th className="py-2 px-3">Producto</th>
                  <th className="py-2 px-2">Categoría</th>
                  <th className="py-2 px-2 text-center">Unidades</th>
                  <th className="py-2 px-3 text-right">Recaudo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {top15ProductosSemana.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                        <div className="text-sm font-bold text-slate-300">No hay ventas registradas aún</div>
                        <div className="text-xs text-slate-500">
                          El ranking de los 15 productos más vendidos se calculará automáticamente en tiempo real a medida que se registren comandas en Caja POS o Kiosco digital.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  top15ProductosSemana.map((item) => (
                    <tr key={item.rank} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-2 text-center font-black text-xs text-indigo-400 font-display">
                        {item.rank <= 3 ? `🥇 #${item.rank}` : `#${item.rank}`}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-white text-xs">{item.nombre}</span>
                        <span className="text-[10px] text-slate-400 block sm:hidden">
                          ${item.precio.toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-400">
                        {item.categoria}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-emerald-400 text-xs">
                        {item.unidades}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white text-xs">
                        ${item.total.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

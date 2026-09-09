import React, { useState, useMemo } from 'react';
import { AuditLog, UserRole } from '../types';
import { 
  Search, 
  ShieldCheck, 
  FileSpreadsheet, 
  Filter, 
  Clock, 
  Layers, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  PackageX, 
  TrendingUp, 
  DollarSign, 
  Lock,
  Tag,
  ArrowUpDown,
  Laptop
} from 'lucide-react';

interface AuditoriaScreenProps {
  auditLogs: AuditLog[];
  userRole?: UserRole;
  staffName?: string;
}

export const AuditoriaScreen: React.FC<AuditoriaScreenProps> = ({
  auditLogs,
  userRole = 'Admin',
  staffName = 'Carlos Mendoza (Admin)',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedStaff, setSelectedStaff] = useState<string>('todos');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filtered list
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.accion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.detalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.usuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.modulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.ip && log.ip.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchModule = selectedModule === 'todos' || log.modulo === selectedModule;
      const matchType = selectedType === 'todos' || log.tipo === selectedType;
      const matchStaff = selectedStaff === 'todos' || log.usuario.includes(selectedStaff);

      return matchSearch && matchModule && matchType && matchStaff;
    });
  }, [auditLogs, searchQuery, selectedModule, selectedType, selectedStaff]);

  // KPIs
  const totalAuditedEvents = auditLogs.length;
  const inventoryEvents = auditLogs.filter((l) => l.modulo === 'Inventario' || l.modulo === 'Precios').length;
  const bajaEvents = auditLogs.filter((l) => l.modulo === 'Bajas').length;
  const posEvents = auditLogs.filter((l) => l.modulo === 'Caja POS').length;

  // Unique staff list for filter
  const uniqueStaff = useMemo(() => {
    const list = Array.from(new Set(auditLogs.map((l) => l.usuario)));
    return list;
  }, [auditLogs]);

  // Export audit logs to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Hora', 'Funcionario', 'Email', 'Rol', 'Modulo', 'Tipo Accion', 'Accion', 'Detalle', 'Terminal/IP'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.fecha,
      l.hora,
      `"${l.usuario.replace(/"/g, '""')}"`,
      l.email,
      l.rol,
      l.modulo,
      l.tipo,
      `"${l.accion.replace(/"/g, '""')}"`,
      `"${l.detalle.replace(/"/g, '""')}"`,
      `"${(l.ip || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Auditoria_Personal_CGAO_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'Inventario':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Precios':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Bajas':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Caja POS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Usuarios':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Despacho':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'creacion':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
      case 'edicion':
        return 'bg-indigo-900/60 text-indigo-300 border-indigo-500/40';
      case 'eliminacion':
        return 'bg-red-900/60 text-red-300 border-red-500/40';
      case 'baja':
        return 'bg-rose-900/60 text-rose-300 border-rose-500/40';
      case 'ajuste':
        return 'bg-amber-900/60 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase font-display">
              CONTROL INTERNO & SUPERVISIÓN INSTITUCIONAL
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Centro CGAO Vélez • Santander</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <span>Registro de Auditoría del Personal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Trazabilidad rigurosa de todas las modificaciones ejecutadas exclusivamente por funcionarios (Administrador, Cajero, Despacho y Auditoría). No registra actividad pública ni consultas de clientes.
          </p>
        </div>

        {/* Action button: Export */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Filtro anti-clientes activo</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Bitácora (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL EVENTOS AUDITADOS</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-display">
              {totalAuditedEvents} <span className="text-xs text-slate-400 font-medium">registros</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">100% acciones de personal registradas</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">INVENTARIO & PRECIOS</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-400 font-display">
              {inventoryEvents} <span className="text-xs text-slate-400 font-medium">modificaciones</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Ajustes de stock, tarifas y costos</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="font-bold uppercase tracking-wider text-[10px]">BAJAS / MERMAS AUDITADAS</span>
            <PackageX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-display">
              {bajaEvents} <span className="text-xs text-rose-300 font-medium">descargos</span>
            </span>
            <p className="text-[10px] text-rose-300/80 mt-1">Insumos dados de baja con justificación</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-bold uppercase tracking-wider text-[10px]">OPERACIONES DE CAJA POS</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">
              {posEvents} <span className="text-xs text-emerald-300 font-medium">arqueos/aperturas</span>
            </span>
            <p className="text-[10px] text-emerald-300/80 mt-1">Supervisión de recaudo y gavetas</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por funcionario, acción, producto..."
              className="w-full bg-[#0c121e] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Module Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-[#0c121e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="todos">Todos los Módulos</option>
              <option value="Inventario">Inventario</option>
              <option value="Precios">Precios & Tarifas</option>
              <option value="Bajas">Bajas & Mermas</option>
              <option value="Caja POS">Caja POS & Arqueos</option>
              <option value="Usuarios">Usuarios & Saldo</option>
              <option value="Despacho">Despacho & Cocina</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#0c121e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="todos">Cualquier Tipo</option>
              <option value="edicion">Edición / Modif.</option>
              <option value="ajuste">Ajuste de Stock</option>
              <option value="baja">Baja de Insumo</option>
              <option value="creacion">Creación / Alta</option>
              <option value="eliminacion">Eliminación</option>
              <option value="seguridad">Seguridad / Turno</option>
            </select>
          </div>

          {/* Staff Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full bg-[#0c121e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="todos">Todos los Funcionarios</option>
              {uniqueStaff.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
          <span>
            Mostrando <strong className="text-white">{filteredLogs.length}</strong> de {auditLogs.length} registros auditados
          </span>
          {(searchQuery || selectedModule !== 'todos' || selectedType !== 'todos' || selectedStaff !== 'todos') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedModule('todos');
                setSelectedType('todos');
                setSelectedStaff('todos');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table / Timeline */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d1424]/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Funcionario (Personal)</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Acción Realizada</th>
                <th className="py-3 px-4">Detalle / Justificación</th>
                <th className="py-3 px-4 text-right">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-white">No se encontraron registros de auditoría</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba cambiando los filtros de búsqueda o módulo.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{log.fecha}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono pl-5">{log.hora}</span>
                    </td>

                    {/* Staff Member */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                          {log.usuario.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {log.usuario}
                          </span>
                          <span className="text-[10px] text-slate-400">{log.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Modulo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getModuleBadge(log.modulo)}`}>
                        {log.modulo}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeBadge(log.tipo)}`}>
                        {log.tipo.toUpperCase()}
                      </span>
                    </td>

                    {/* Accion */}
                    <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-[200px] truncate">
                      {log.accion}
                    </td>

                    {/* Detalle */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs max-w-[320px]">
                      <p className="line-clamp-2 leading-relaxed">{log.detalle}</p>
                    </td>

                    {/* Terminal / IP */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center justify-end gap-1.5 text-slate-400">
                        <Laptop className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.ip || 'Terminal Local'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail for Selected Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel-elevated bg-[#0f172a] border border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  REGISTRO TÉCNICO DE AUDITORÍA
                </span>
                <h3 className="text-base font-bold text-white font-display mt-0.5">
                  {selectedLog.accion}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-slate-400 text-[10px] block">Funcionario Responsable</span>
                  <span className="text-white font-semibold">{selectedLog.usuario}</span>
                  <span className="text-[10px] text-slate-500 block">{selectedLog.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Rol Institucional</span>
                  <span className="text-indigo-300 font-semibold">{selectedLog.rol}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Momento del Registro</span>
                  <span className="text-slate-200 font-mono text-[11px]">{selectedLog.fecha} a las {selectedLog.hora}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Terminal & Conexión</span>
                  <span className="text-slate-200 font-mono text-[11px]">{selectedLog.ip || 'Terminal Cafetería'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Descripción Detallada del Cambio
                </span>
                <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 text-slate-200 leading-relaxed text-xs">
                  {selectedLog.detalle}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[11px] text-slate-400">Módulo Afectado:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getModuleBadge(selectedLog.modulo)}`}>
                  {selectedLog.modulo}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400">ID Operación:</span>
                <span className="font-mono text-[10px] text-indigo-300">{selectedLog.id}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

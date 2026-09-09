import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';
import { 
  ChefHat, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Bell, 
  Calendar, 
  Layers, 
  User, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Check
} from 'lucide-react';
import { soundEngine } from '../utils/sound';

export interface DespachoTicket {
  id: string;
  turno: string;
  clienteNombre: string;
  documento?: string;
  ficha?: string;
  programa?: string;
  tipo: 'Almuerzo' | 'Rápida' | 'Bebidas';
  tiempoMin: number;
  fecha: 'Hoy' | 'Esta Semana' | 'Este Mes';
  estado: 'entrante' | 'preparacion' | 'listo' | 'entregado';
  items: Array<{ cantidad: number; nombre: string; detalle?: string }>;
}

interface DespachoScreenProps {
  userRole?: UserRole;
}

export const DespachoScreen: React.FC<DespachoScreenProps> = ({ userRole = 'Despachador' }) => {
  const isReadOnly = userRole === 'Auditor';
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes'>('hoy');

  const [tickets, setTickets] = useState<DespachoTicket[]>([
    {
      id: 'k-042',
      turno: '#042',
      clienteNombre: 'Juan Carlos Pérez Gómez',
      documento: '1.020.304.050',
      ficha: '2671234',
      programa: 'ADSO / Software CGAO',
      tipo: 'Almuerzo',
      tiempoMin: 4,
      fecha: 'Hoy',
      estado: 'preparacion',
      items: [
        { cantidad: 1, nombre: 'Almuerzo Ejecutivo SENA', detalle: 'Pechuga grille + Arroz finas hierbas + Ensalada fresca' },
        { cantidad: 1, nombre: 'Jugo de Naranja 16oz', detalle: '100% natural, sin azúcar' },
      ],
    },
    {
      id: 'k-043',
      turno: '#043',
      clienteNombre: 'Mariana Ospina Gómez',
      documento: '1.020.489.501',
      ficha: '2558190',
      programa: 'Gastronomía y Alimentos',
      tipo: 'Almuerzo',
      tiempoMin: 6,
      fecha: 'Hoy',
      estado: 'preparacion',
      items: [
        { cantidad: 1, nombre: 'Almuerzo Ejecutivo SENA', detalle: '¡OJO! Sin ensalada con cebolla' },
        { cantidad: 1, nombre: 'Limonada Natural' },
      ],
    },
    {
      id: 'k-044',
      turno: '#044',
      clienteNombre: 'Andrés Felipe Castro',
      documento: '80.194.821',
      ficha: 'Planta Docente',
      programa: 'Instructor ADSO',
      tipo: 'Rápida',
      tiempoMin: 2,
      fecha: 'Hoy',
      estado: 'entrante',
      items: [
        { cantidad: 1, nombre: 'Hamburguesa Artesanal', detalle: 'Vegetales frescos de la huerta CGAO' },
        { cantidad: 1, nombre: 'Café Americano CGAO' },
      ],
    },
    {
      id: 'k-045',
      turno: '#045',
      clienteNombre: 'Daniela Restrepo Ruiz',
      documento: '1.031.940.221',
      ficha: '2710443',
      programa: 'Gestión Agroempresarial',
      tipo: 'Rápida',
      tiempoMin: 1,
      fecha: 'Hoy',
      estado: 'entrante',
      items: [
        { cantidad: 1, nombre: 'Pastel de Pollo Hojaldrado' },
        { cantidad: 1, nombre: 'Pandebono Tradicional' },
      ],
    },
    {
      id: 'k-041',
      turno: '#041',
      clienteNombre: 'Camila Morales',
      documento: '1.014.298.102',
      ficha: '2694120',
      programa: 'ADSO',
      tipo: 'Bebidas',
      tiempoMin: 8,
      fecha: 'Hoy',
      estado: 'listo',
      items: [
        { cantidad: 2, nombre: 'Empanada de Carne' },
        { cantidad: 1, nombre: 'Jugo de Naranja 16oz' },
      ],
    },
    // Past tickets for week and month
    {
      id: 'k-037',
      turno: '#037',
      clienteNombre: 'Sebastián Gómez',
      documento: '1.018.990.112',
      ficha: '2671234',
      programa: 'Mantenimiento Electrónico',
      tipo: 'Almuerzo',
      tiempoMin: 15,
      fecha: 'Esta Semana',
      estado: 'entregado',
      items: [
        { cantidad: 1, nombre: 'Almuerzo Ejecutivo SENA' },
      ],
    },
    {
      id: 'k-025',
      turno: '#025',
      clienteNombre: 'Prof. Mario Fonseca',
      documento: '19.832.411',
      ficha: 'CGAO Vélez',
      programa: 'Coordinación Académica',
      tipo: 'Bebidas',
      tiempoMin: 22,
      fecha: 'Este Mes',
      estado: 'entregado',
      items: [
        { cantidad: 3, nombre: 'Café Americano CGAO' },
        { cantidad: 2, nombre: 'Pastel de Pollo Hojaldrado' },
      ],
    },
  ]);

  // Advance state
  const handleAdvanceTicket = (id: string) => {
    if (isReadOnly) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          if (t.estado === 'entrante') {
            return { ...t, estado: 'preparacion' };
          }
          if (t.estado === 'preparacion') {
            soundEngine.playCafeteriaBell();
            return { ...t, estado: 'listo' };
          }
          if (t.estado === 'listo') {
            soundEngine.playCashRegisterBeep();
            return { ...t, estado: 'entregado' };
          }
        }
        return t;
      })
    );
  };

  const handleRevertTicket = (id: string) => {
    if (isReadOnly) return;
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          if (t.estado === 'listo') return { ...t, estado: 'preparacion' };
          if (t.estado === 'preparacion') return { ...t, estado: 'entrante' };
          if (t.estado === 'entregado') return { ...t, estado: 'listo' };
        }
        return t;
      })
    );
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (dateFilter === 'hoy') return t.fecha === 'Hoy';
      if (dateFilter === 'semana') return t.fecha === 'Hoy' || t.fecha === 'Esta Semana';
      return true; // mes
    });
  }, [tickets, dateFilter]);

  const entrantes = filteredTickets.filter((t) => t.estado === 'entrante');
  const enPreparacion = filteredTickets.filter((t) => t.estado === 'preparacion');
  const listos = filteredTickets.filter((t) => t.estado === 'listo');
  const entregados = filteredTickets.filter((t) => t.estado === 'entregado');

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase font-display">
              PANTALLA DE CONTROL & DESPACHO
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Cocina & Barra CGAO Vélez • Santander 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Módulo de Despacho Gastronómico
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Línea de ensamblaje de comandas, llamado por turno a aprendices e instructores y control de entrega en mostrador.
          </p>
        </div>

        {/* Date Filter Buttons: Hoy / Semana / Mes */}
        <div className="flex items-center gap-3">
          {isReadOnly && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Modo Auditor (Solo Lectura)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 p-1 bg-[#0c121e] rounded-xl border border-white/10">
            <button
              onClick={() => setDateFilter('hoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilter === 'hoy'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Pedidos de Hoy</span>
            </button>
            <button
              onClick={() => setDateFilter('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilter === 'semana'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>De la Semana</span>
            </button>
            <button
              onClick={() => setDateFilter('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilter === 'mes'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Del Mes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns: Entrantes, En Preparación, Listos para Recoger, Entregados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Entrantes */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-display">
                1. Nuevos / Entrantes
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
              {entrantes.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {entrantes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                Sin pedidos entrantes
              </div>
            ) : (
              entrantes.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isReadOnly={isReadOnly}
                  onAdvance={() => handleAdvanceTicket(ticket.id)}
                  onRevert={() => handleRevertTicket(ticket.id)}
                  nextLabel="Iniciar Preparación"
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: En Preparación */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <h3 className="text-xs font-extrabold text-purple-200 uppercase tracking-wider font-display">
                2. En Cocina / Emplatado
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold">
              {enPreparacion.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {enPreparacion.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                Línea de cocción despejada
              </div>
            ) : (
              enPreparacion.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isReadOnly={isReadOnly}
                  onAdvance={() => handleAdvanceTicket(ticket.id)}
                  onRevert={() => handleRevertTicket(ticket.id)}
                  nextLabel="Marcar Listo (Campana)"
                  accent="purple"
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Listos para Recoger */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-extrabold text-emerald-200 uppercase tracking-wider font-display">
                3. Listos en Barra
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold">
              {listos.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {listos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                Ninguna bandeja en espera
              </div>
            ) : (
              listos.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isReadOnly={isReadOnly}
                  onAdvance={() => handleAdvanceTicket(ticket.id)}
                  onRevert={() => handleRevertTicket(ticket.id)}
                  nextLabel="Completar Entrega"
                  accent="emerald"
                />
              ))
            )}
          </div>
        </div>

        {/* Column 4: Entregados / Historial */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider font-display">
                4. Entregados
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
              {entregados.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {entregados.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                Sin entregas registradas en este periodo
              </div>
            ) : (
              entregados.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isReadOnly={isReadOnly}
                  onAdvance={() => {}}
                  onRevert={() => handleRevertTicket(ticket.id)}
                  isFinalized={true}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual Ticket Card in Despacho
interface TicketCardProps {
  ticket: DespachoTicket;
  isReadOnly: boolean;
  onAdvance: () => void;
  onRevert: () => void;
  nextLabel?: string;
  accent?: 'purple' | 'emerald';
  isFinalized?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  isReadOnly,
  onAdvance,
  onRevert,
  nextLabel,
  accent,
  isFinalized = false,
}) => {
  return (
    <div className={`glass-card rounded-2xl p-4 border transition-all ${
      accent === 'purple'
        ? 'border-purple-500/30 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
        : accent === 'emerald'
        ? 'border-emerald-500/40 bg-emerald-950/25 shadow-[0_0_15px_rgba(57,169,0,0.2)]'
        : isFinalized
        ? 'border-white/5 opacity-60'
        : 'border-white/10'
    }`}>
      {/* Header: Turno Number & Customer Full Name */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
        <div>
          <span className="text-2xl font-black text-white font-display block">
            {ticket.turno}
          </span>
          {/* Full customer name clearly displayed as requested */}
          <h4 className="text-xs font-bold text-indigo-300 mt-0.5">
            {ticket.clienteNombre}
          </h4>
          {ticket.programa && (
            <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
              {ticket.programa}
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
            {ticket.tipo}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {ticket.fecha}
          </span>
        </div>
      </div>

      {/* Food Items */}
      <div className="py-2.5 space-y-1.5 text-xs">
        {ticket.items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="font-extrabold text-white bg-white/10 px-1 rounded text-[11px] shrink-0">
              {item.cantidad}x
            </span>
            <div>
              <span className="text-slate-200 font-medium">{item.nombre}</span>
              {item.detalle && (
                <p className="text-[10px] text-amber-300/90 italic leading-snug">
                  {item.detalle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls: Change State */}
      {!isReadOnly && (
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
          {ticket.estado !== 'entrante' && (
            <button
              onClick={onRevert}
              title="Devolver al estado anterior"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {!isFinalized && nextLabel && (
            <button
              onClick={onAdvance}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-display flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                accent === 'emerald'
                  ? 'bg-gradient-to-r from-emerald-600 to-[#39a900] text-white hover:brightness-110'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isFinalized && (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mx-auto">
              <Check className="w-3 h-3" /> Entregado a Aprendiz
            </span>
          )}
        </div>
      )}
    </div>
  );
};

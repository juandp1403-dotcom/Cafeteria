import React, { useState } from 'react';
import { Order, OrderStatus, ServiceReview } from '../types';
import { 
  CheckCircle2, 
  ChefHat, 
  Bell, 
  Download, 
  PlusCircle, 
  Volume2, 
  HelpCircle, 
  Utensils, 
  Wallet,
  Sparkles,
  Star,
  MessageSquareHeart,
  Send,
  Check
} from 'lucide-react';
import { soundEngine } from '../utils/sound';
import { assets } from '../assets/images';

interface MiTurnoScreenProps {
  order: Order;
  onNewOrder: () => void;
  onOpenReceipt: () => void;
  onAdvanceState?: (newStatus: OrderStatus) => void;
  onSubmitReview?: (review: ServiceReview) => void;
}

export const MiTurnoScreen: React.FC<MiTurnoScreenProps> = ({
  order,
  onNewOrder,
  onOpenReceipt,
  onAdvanceState,
  onSubmitReview,
}) => {
  const [bellRinging, setBellRinging] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Review states
  const [calificacion, setCalificacion] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Atención rápida', 'Excelente sazón']);
  const [comentario, setComentario] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const availableTags = [
    'Atención rápida',
    'Excelente sazón',
    'Temperatura ideal',
    'Amabilidad en caja',
    'Porción adecuada',
    'Higiene impecable',
  ];

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    const newReview: ServiceReview = {
      id: `rev-${Date.now()}`,
      pedidoTurno: order.numeroTurno,
      clienteNombre: order.cliente.nombre,
      calificacion,
      tags: selectedTags,
      comentario: comentario.trim() || 'Servicio satisfactorio en Cafetería CGAO.',
      fecha: 'Hoy',
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };

    if (onSubmitReview) {
      onSubmitReview(newReview);
    }
    soundEngine.playCashRegisterBeep();
    setReviewSubmitted(true);
  };

  const handleRingBell = () => {
    setBellRinging(true);
    soundEngine.playCafeteriaBell();
    setTimeout(() => setBellRinging(false), 1200);
  };

  const stepStatus = order.estado;
  const currentStep = 
    stepStatus === 'pago_confirmado' ? 1 :
    stepStatus === 'en_preparacion' ? 2 :
    stepStatus === 'listo_recoger' ? 3 : 4;

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6">
      {/* Realtime Live Header Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39a900]"></span>
        </span>
        <span className="text-xs font-bold tracking-wider text-emerald-400 font-display uppercase">
          CENTRO CGAO VÉLEZ • SEGUIMIENTO EN VIVO 2026
        </span>
      </div>

      {/* Main 2-Column Order Tracking Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Order Card, Breakdown, QR & Barcode */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel-elevated rounded-2xl p-6 border border-white/15 shadow-2xl space-y-5">
            {/* Top row: Order Number (Tiempo Estimado REMOVED as requested) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider font-display">
                  ORDEN ACTIVA • CGAO VÉLEZ
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-4xl sm:text-5xl font-black text-white font-display tracking-tight">
                    {order.numeroTurno}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    TURNO GENERAL
                  </span>
                </div>
              </div>

              <div className="bg-[#101b2a] border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39a900] animate-pulse" />
                <span className="text-emerald-400 font-bold">Estado: {stepStatus.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>

            {/* Customer Identification Subcard */}
            <div className="bg-[#0f172a]/70 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                  {order.cliente.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {order.cliente.nombre}
                  </h4>
                  <span className="text-[11px] text-indigo-300">
                    Ficha {order.cliente.ficha} • {order.cliente.programa}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] text-slate-400">
                <span className="block font-semibold text-slate-300">FECHA & HORA</span>
                <span>{order.fecha} • {order.hora}</span>
              </div>
            </div>

            {/* Order Items Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-display">
                  DESGLOSE DEL PEDIDO ({order.items.length} ÍTEMS)
                </span>
              </div>

              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0e1626]/70 border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px] shrink-0 mt-0.5">
                        {item.cantidad}x
                      </span>
                      <div>
                        <h5 className="font-bold text-white text-xs sm:text-sm">
                          {item.nombre}
                        </h5>
                        {item.descripcion && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="font-bold text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                      ${item.total.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method & Total Banner */}
            <div className="bg-[#12221b] border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#39a900]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    MÉTODO DE PAGO
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm">
                    <span>{order.metodoPago}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#39a900]" />
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TOTAL LIQUIDADO
                </span>
                <span className="text-2xl font-black text-[#39a900] font-display">
                  ${order.total.toLocaleString('es-CO')}{' '}
                  <span className="text-xs font-semibold text-emerald-300">COP</span>
                </span>
              </div>
            </div>

            {/* QR Code and Barcode Section */}
            <div className="bg-[#0b101c] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2.5 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  <rect width="100" height="100" fill="#ffffff" />
                  <rect x="10" y="10" width="26" height="26" fill="#000000" />
                  <rect x="14" y="14" width="18" height="18" fill="#ffffff" />
                  <rect x="18" y="18" width="10" height="10" fill="#000000" />

                  <rect x="64" y="10" width="26" height="26" fill="#000000" />
                  <rect x="68" y="14" width="18" height="18" fill="#ffffff" />
                  <rect x="72" y="18" width="10" height="10" fill="#000000" />

                  <rect x="10" y="64" width="26" height="26" fill="#000000" />
                  <rect x="14" y="68" width="18" height="18" fill="#ffffff" />
                  <rect x="18" y="72" width="10" height="10" fill="#000000" />

                  <rect x="42" y="12" width="6" height="6" fill="#000000" />
                  <rect x="52" y="12" width="6" height="6" fill="#000000" />
                  <rect x="42" y="24" width="6" height="6" fill="#000000" />
                  <rect x="48" y="32" width="6" height="6" fill="#000000" />
                  <rect x="42" y="44" width="18" height="18" fill="#000000" />
                  <rect x="46" y="48" width="10" height="10" fill="#ffffff" />
                  <rect x="68" y="42" width="8" height="8" fill="#000000" />
                  <rect x="80" y="42" width="8" height="8" fill="#000000" />
                  <rect x="72" y="56" width="6" height="6" fill="#000000" />
                  <rect x="82" y="56" width="6" height="6" fill="#000000" />
                  <rect x="42" y="70" width="8" height="8" fill="#000000" />
                  <rect x="54" y="70" width="6" height="6" fill="#000000" />
                  <rect x="68" y="72" width="20" height="6" fill="#000000" />
                  <rect x="74" y="82" width="14" height="6" fill="#000000" />
                </svg>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <span className="text-[10px] font-extrabold text-[#39a900] uppercase tracking-wider font-display">
                    ESCANEO EN VENTANILLA DE DESPACHO
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                    Presenta este código al personal del módulo de entrega cuando anuncien tu turno.
                  </p>
                </div>

                <div className="inline-flex flex-col items-center sm:items-start pt-1">
                  <div className="flex items-center gap-[2px] h-7 px-2 py-0.5 bg-white/90 rounded text-black">
                    <div className="w-[3px] h-full bg-black" />
                    <div className="w-[1px] h-full bg-black" />
                    <div className="w-[2px] h-full bg-black" />
                    <div className="w-[4px] h-full bg-black" />
                    <div className="w-[1px] h-full bg-black" />
                    <div className="w-[3px] h-full bg-black" />
                    <div className="w-[2px] h-full bg-black" />
                    <div className="w-[5px] h-full bg-black" />
                    <div className="w-[1px] h-full bg-black" />
                    <div className="w-[3px] h-full bg-black" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {order.codigoBarras || '9842-1042-SENA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={onOpenReceipt}
                className="py-2.5 px-4 rounded-xl bg-[#141d30] hover:bg-[#1a253c] border border-white/10 text-white text-xs font-bold font-display flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Descargar Comprobante</span>
              </button>

              <button
                onClick={onNewOrder}
                className="py-2.5 px-4 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold font-display flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Realizar Nuevo Pedido</span>
              </button>
            </div>
          </div>

          {/* Calificar Servicio / Reseña de Atención Card (Requirement: el cliente puede hacer una reseña) */}
          <div className="glass-panel-elevated rounded-2xl p-5 border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-extrabold text-white font-display">
                  Reseña de Atención y Servicio
                </h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20">
                Opinión del Aprendiz
              </span>
            </div>

            {reviewSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#39a900]/20 text-[#39a900] flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white">¡Gracias por tu retroalimentación!</h4>
                <p className="text-[11px] text-slate-300">
                  Tu reseña ha sido registrada e impacta directamente los indicadores de satisfacción del Centro CGAO Vélez.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReview} className="space-y-3">
                <p className="text-xs text-slate-300">
                  ¿Cómo fue la rapidez, calidad y amabilidad en la entrega de tu pedido?
                </p>

                {/* Interactive Star Rating */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Calificación:</span>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating !== null ? hoverRating : calificacion);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setCalificacion(star)}
                        className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-amber-400 ml-1 font-display">
                    {calificacion === 5 ? '¡Excelente! (5/5)' : calificacion === 4 ? 'Muy Buena (4/5)' : `${calificacion}/5`}
                  </span>
                </div>

                {/* Quick Feedback Tags */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Aspectos destacados:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white shadow-sm border border-indigo-400'
                              : 'bg-[#101827] text-slate-400 hover:text-slate-200 border border-white/5'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comments text area */}
                <div>
                  <textarea
                    rows={2}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Deja un comentario o sugerencia para el equipo de cocina y caja..."
                    className="w-full bg-[#0c121e] border border-white/10 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-[#39a900] text-white text-xs font-bold font-display flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Reseña de Atención</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Estado del Despacho Stepper & Quality Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel-elevated rounded-2xl p-6 border border-white/15 shadow-2xl space-y-5">
            {/* Top IDs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-300">ID Venta:</span>
                <span className="font-mono text-indigo-300">{order.idVenta}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-300">Mesa / Kiosko:</span>
                <span className="font-mono text-emerald-400">{order.mesaKiosko}</span>
              </div>
            </div>

            {/* Stepper Header */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                  <h3 className="text-base font-extrabold text-white font-display">
                    Estado del Despacho
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                  Fase {currentStep} de 4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Sincronización en tiempo real con la pantalla del módulo de despacho en cocina.
              </p>
            </div>

            {/* Vertical Stepper Timeline */}
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
              {/* Step 1: Pago Confirmado */}
              <div 
                className="relative flex items-start gap-3.5 cursor-pointer group"
                onClick={() => onAdvanceState && onAdvanceState('pago_confirmado')}
                title="Click para alternar estado"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.5)] z-10">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">
                      1. Pago Confirmado
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Exitoso
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Aprobado a las {order.hora}
                  </p>
                </div>
              </div>

              {/* Step 2: En Preparación */}
              <div 
                className="relative flex items-start gap-3.5 cursor-pointer group"
                onClick={() => onAdvanceState && onAdvanceState('en_preparacion')}
                title="Click para alternar estado"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  currentStep >= 2
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.5)]'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">
                      2. En Preparación
                    </h4>
                    {currentStep === 2 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tu bandeja está en ensamblaje en cocina.
                  </p>

                  {currentStep === 2 && (
                    <div className="mt-2 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-[#39a900] w-3/4 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Listo para Recoger */}
              <div 
                className="relative flex items-start gap-3.5 cursor-pointer group"
                onClick={() => onAdvanceState && onAdvanceState('listo_recoger')}
                title="Click para alternar estado"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  currentStep >= 3
                    ? 'bg-[#39a900] text-white shadow-[0_0_15px_rgba(57,169,0,0.6)]'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-200">
                    3. Listo para Recoger
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Se notificará por altavoz y aviso luminoso en barra.
                  </p>
                </div>
              </div>

              {/* Step 4: Entregado & Finalizado */}
              <div 
                className="relative flex items-start gap-3.5 cursor-pointer group"
                onClick={() => onAdvanceState && onAdvanceState('entregado')}
                title="Click para alternar estado"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  currentStep >= 4
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-400">
                    4. Entregado & Finalizado
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pedido despachado exitosamente.
                  </p>
                </div>
              </div>
            </div>

            {/* Sound Notification Alert row with Probar Campana button */}
            <div className="p-3 rounded-xl bg-[#0f172a] border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Notificación sonora activada</span>
              </div>

              <button
                onClick={handleRingBell}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  bellRinging
                    ? 'bg-emerald-500 text-white scale-105 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                    : 'bg-[#182338] hover:bg-[#202e49] text-indigo-300 border border-indigo-400/30'
                }`}
              >
                Probar campana
              </button>
            </div>

            {/* Guaranteed Quality Card */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0e1524]">
              <div className="relative h-28 w-full">
                <img
                  src={assets.almuerzoEjecutivo}
                  alt="Calidad Garantizada CGAO"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e1524] via-transparent to-black/30" />
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#39a900]" />
                    Recién preparado
                  </span>
                </div>
              </div>

              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white font-display">
                  Calidad Garantizada CGAO Vélez
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ingredientes auditados por instructores del Centro de Gestión Agroempresarial del Oriente • Santander 2026.
                </p>
              </div>
            </div>

            {/* Help / Assistance Banner */}
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px]">
                  ¿Inconveniente con tu turno? Consulta en ventanilla rápida
                </span>
              </div>
              <button
                onClick={() => setShowHelpModal(true)}
                className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer shrink-0"
              >
                Ayuda
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel-elevated rounded-2xl max-w-md w-full p-6 border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Mesa de Ayuda CGAO
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Si tu orden presenta retraso o necesitas cambio de menú por intolerancia o alergia, acércate a la <strong>Ventanilla de Despacho</strong> con tu turno #{order.numeroTurno}.
            </p>

            <div className="bg-[#121929] rounded-xl p-3 text-xs space-y-1 text-slate-300">
              <p><strong>Ubicación:</strong> Centro CGAO Vélez - Cafetería Central</p>
              <p><strong>Horario de atención:</strong> 06:00 AM - 02:00 PM</p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

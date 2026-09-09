import React from 'react';
import { Order } from '../types';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import { CGAOLogo } from './CGAOLogo';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#0d131f] border border-white/20 p-6 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Visual Body (Thermal Paper Vibe with Liquid Glass details) */}
        <div id="printable-receipt" className="bg-[#121a2b] border border-white/10 rounded-xl p-5 space-y-4 font-mono text-xs text-slate-200">
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-white/20">
            <div className="flex justify-center mb-1">
              <CGAOLogo size="sm" showText={false} />
            </div>
            <h3 className="font-extrabold text-white font-display text-sm tracking-wider">
              CAFETERÍA CGAO SENA
            </h3>
            <p className="text-[10px] text-slate-400">Complejo Paloquemao - Bogotá D.C.</p>
            <p className="text-[10px] text-slate-400">NIT: 899.999.034-1</p>
            <p className="text-[10px] text-emerald-400 font-bold">Régimen Especial Institucional</p>
          </div>

          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-white/20">
            <div className="flex justify-between">
              <span className="text-slate-400">TURNO:</span>
              <span className="font-bold text-white text-sm">{order.numeroTurno}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">VENTA:</span>
              <span className="text-slate-300">{order.idVenta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">APRENDIZ:</span>
              <span className="text-white font-bold">{order.cliente.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DOCUMENTO:</span>
              <span>{order.cliente.documento}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">FICHA:</span>
              <span>{order.cliente.ficha} ({order.cliente.programa})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">FECHA:</span>
              <span>{order.fecha} {order.hora}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-white/20">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.cantidad}x {item.nombre}</span>
                <span className="font-semibold">${item.total.toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-white/20">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span>${order.subtotal.toLocaleString('es-CO')}</span>
            </div>
            {order.descuento > 0 && (
              <div className="flex justify-between text-[#39a900]">
                <span>Descuento Aplicado:</span>
                <span>-${order.descuento.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-white pt-1">
              <span>TOTAL PAGADO:</span>
              <span className="text-emerald-400">${order.total.toLocaleString('es-CO')} COP</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Medio de Pago:</span>
              <span>{order.metodoPago}</span>
            </div>
          </div>

          <div className="text-center pt-1 space-y-1">
            <p className="text-[10px] text-slate-400">
              Presenta este tiquete en la barra para reclamar tus alimentos.
            </p>
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
              ¡Buen provecho, familia SENA!
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-slate-200 text-xs font-bold font-display flex items-center justify-center cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

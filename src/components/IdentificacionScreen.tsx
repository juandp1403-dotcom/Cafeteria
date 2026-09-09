import React, { useState } from 'react';
import { UserAprendiz } from '../types';
import { CGAOLogo } from './CGAOLogo';
import { 
  CreditCard, 
  User as UserIcon, 
  Hash, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  LockKeyhole
} from 'lucide-react';

interface IdentificacionScreenProps {
  user: UserAprendiz;
  onUpdateUser: (user: UserAprendiz) => void;
  onStartOrder: () => void;
  onGoToAccesoPersonal: () => void;
}

export const IdentificacionScreen: React.FC<IdentificacionScreenProps> = ({
  user,
  onUpdateUser,
  onStartOrder,
  onGoToAccesoPersonal,
}) => {
  const [formData, setFormData] = useState({
    tipoDoc: user.tipoDoc || 'C.C. Cédula',
    documento: user.documento || '1020304050',
    nombre: user.nombre || 'Juan Carlos Pérez Gómez',
    ficha: user.ficha || '2671234',
    programa: user.programa || 'ADSO / Análisis y Desarrollo de Software',
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documento.trim() || !formData.nombre.trim()) {
      setValidationError('Por favor completa el número de documento y tu nombre completo.');
      return;
    }

    onUpdateUser({
      ...user,
      tipoDoc: formData.tipoDoc,
      documento: formData.documento,
      nombre: formData.nombre,
      ficha: formData.ficha,
      programa: formData.programa,
      verificado: true,
    });

    onStartOrder();
  };

  return (
    <div className="relative min-h-[calc(100vh-130px)] flex flex-col items-center justify-center py-8 px-4 sm:px-6">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-gradient-to-br from-indigo-600/10 via-emerald-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Center Card */}
      <div className="relative w-full max-w-xl glass-panel-elevated rounded-2xl p-6 sm:p-8 border border-white/15 shadow-2xl z-10">
        {/* Top Header with Institutional Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#162035] border border-white/10 text-xs text-slate-300 font-medium mb-3">
            <span className="w-2 h-2 rounded-full bg-[#39a900]"></span>
            <span className="font-semibold text-emerald-400">KIOSCO DIGITAL CGAO</span>
            <span className="text-slate-500">•</span>
            <span>Vélez, Santander</span>
            <span className="text-slate-500">•</span>
            <span className="text-indigo-300 font-semibold">2026</span>
          </div>

          {/* Logo Cafeteria CGAO */}
          <div className="my-1 flex flex-col items-center">
            <CGAOLogo size="lg" showText={true} />
          </div>

          {/* Button requested: "Acceso personal" right below logo */}
          <button
            type="button"
            onClick={onGoToAccesoPersonal}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#151f33] hover:bg-[#1e2c47] border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer group"
          >
            <LockKeyhole className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Acceso personal</span>
            <span className="text-[10px] text-slate-400 font-normal group-hover:text-slate-200">
              (Admin / Cajero / Despacho / Auditor)
            </span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight mt-4">
            Identificación de Aprendiz
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Ingresa tus datos institucionales para consultar el menú, gestionar tu pedido y turno de ración en tiempo real.
          </p>
        </div>

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Tipo Doc & Número */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                TIPO DOC. *
              </label>
              <select
                value={formData.tipoDoc}
                onChange={(e) => setFormData({ ...formData, tipoDoc: e.target.value })}
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
              >
                <option value="C.C. Cédula">C.C. Cédula</option>
                <option value="T.I. Tarjeta Identidad">T.I. Tarjeta Identidad</option>
                <option value="P.E.P.">P.E.P.</option>
                <option value="C.E. Extranjería">C.E. Extranjería</option>
              </select>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                NÚMERO DE DOCUMENTO *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="Ej: 1020304050"
                  className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Nombre Completo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              NOMBRE COMPLETO *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Juan Carlos Pérez Gómez"
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
            {/* Sub-status label */}
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[10px] text-slate-400">
                Sincronizado con SofiaPlus / Zajuna SENA
              </span>
              <span className="text-[10px] font-bold text-[#39a900] flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                CGAO Vélez
              </span>
            </div>
          </div>

          {/* Row 3: Ficha de Caracterización */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              FICHA DE CARACTERIZACIÓN SENA *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.ficha}
                onChange={(e) => setFormData({ ...formData, ficha: e.target.value })}
                placeholder="Ej: 2671234"
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Big Action Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-6 rounded-xl font-display font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#39a900] hover:brightness-110 shadow-[0_4px_25px_rgba(99,102,241,0.4)] border border-white/20 active:scale-[0.99] cursor-pointer"
          >
            <span>Ingresar al Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Privacy Notice */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#39a900]" />
            <span>Datos protegidos Ley 1581 de 2012</span>
          </div>
          <span className="text-slate-400">
            Regional Santander • 2026
          </span>
        </div>
      </div>
    </div>
  );
};

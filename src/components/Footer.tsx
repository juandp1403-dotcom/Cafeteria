import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#070a12]/90 backdrop-blur-xl py-4 mt-auto">
      <div className="max-w-[94rem] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        {/* Left institutional badge */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white tracking-wider font-display">CGAO SENA</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[#39a900] font-semibold text-[10px]">
            Centro CGAO - Vélez
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">
            Sistema Integral de Alimentación y Pedidos en Tiempo Real
          </span>
        </div>

        {/* Center legal & support links */}
        <div className="flex items-center gap-4 text-[11px]">
          <button className="text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer">
            Ley 1581 – Privacidad
          </button>
          <span className="text-slate-600">•</span>
          <button className="text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer">
            Supresión de Datos
          </button>
          <span className="text-slate-600">•</span>
          <button className="text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer">
            Mesa de Ayuda
          </button>
        </div>

        {/* Right copyright */}
        <div className="text-[11px] text-slate-500">
          © 2026 SENA Regional Santander.
        </div>
      </div>
    </footer>
  );
};

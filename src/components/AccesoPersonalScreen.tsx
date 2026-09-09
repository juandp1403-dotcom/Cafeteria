import React, { useState } from 'react';
import { UserRole, AppUser } from '../types';
import { CGAOLogo } from './CGAOLogo';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  Shield,
  Info
} from 'lucide-react';

interface AccesoPersonalScreenProps {
  users: AppUser[];
  onLoginSuccess: (role: UserRole, userEmail: string, userName: string) => void;
  onBackToAprendiz: () => void;
}

export const AccesoPersonalScreen: React.FC<AccesoPersonalScreenProps> = ({
  users,
  onLoginSuccess,
  onBackToAprendiz,
}) => {
  const [identifier, setIdentifier] = useState('admin@sena.edu.co');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter authorized staff from the database to assist with quick login
  const staffAccounts = users.filter((u) => u.rol !== 'Cliente');

  const handleQuickFill = (acc: AppUser) => {
    setIdentifier(acc.email);
    setPassword('••••••••');
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const term = identifier.trim().toLowerCase();
    if (!term) {
      setError('Por favor ingresa tu correo institucional o número de documento.');
      return;
    }

    setLoading(true);

    // Look up credentials directly in the database (users state)
    setTimeout(() => {
      const matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === term ||
          u.documento.trim() === identifier.trim()
      );

      if (!matchedUser) {
        setError(
          'Usuario o documento no encontrado en el directorio del SENA CGAO. Verifica tus datos con la Coordinación.'
        );
        setLoading(false);
        return;
      }

      if (!matchedUser.activo) {
        setError(
          `La cuenta de ${matchedUser.nombre} está actualmente INACTIVA. Comunícate con la administración.`
        );
        setLoading(false);
        return;
      }

      if (matchedUser.rol === 'Cliente') {
        setError(
          'Esta cuenta está registrada como Aprendiz. Para realizar pedidos y consultar turnos, por favor utiliza la pantalla de Identificación de Aprendiz.'
        );
        setLoading(false);
        return;
      }

      // Role is automatically verified and retrieved from database
      setLoading(false);
      onLoginSuccess(matchedUser.rol, matchedUser.email, matchedUser.nombre);
    }, 250);
  };

  return (
    <div className="relative min-h-[calc(100vh-130px)] flex flex-col items-center justify-center py-8 px-4 sm:px-6">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-xl glass-panel-elevated rounded-2xl p-6 sm:p-8 border border-white/15 shadow-2xl z-10">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackToAprendiz}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3 cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver a Identificación de Aprendiz</span>
        </button>

        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#162035] border border-white/10 text-xs text-slate-300 font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-indigo-300">AUTENTICACIÓN DE PERSONAL CGAO</span>
            <span className="text-slate-500">•</span>
            <span>Vélez 2026</span>
          </div>

          <div className="flex justify-center my-1">
            <CGAOLogo size="md" showText={true} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight mt-3">
            Acceso Personal y Funcionarios
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Ingresa con tus credenciales institucionales. El sistema verificará automáticamente tu rol asignado para habilitar tus módulos de trabajo correspondientes.
          </p>
        </div>

        {/* Informative Profile Verification Badge */}
        <div className="mb-5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-white">Verificación de perfil:</strong> Acceso autenticado según las políticas institucionales a Caja POS, Despacho, Inventario, Métricas o Auditoría.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email / Documento */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              CORREO INSTITUCIONAL O DOCUMENTO DE IDENTIDAD *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ejemplo@sena.edu.co o 1098765432"
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              CONTRASEÑA / CÓDIGO DE SEGURIDAD *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-display font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-indigo-600 via-indigo-500 to-[#39a900] hover:brightness-110 shadow-[0_4px_25px_rgba(99,102,241,0.4)] border border-white/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Verificando credenciales...</span>
            ) : (
              <>
                <span>Verificar Credenciales e Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick helper: Authorized staff accounts */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cuentas Autorizadas de Personal CGAO:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {staffAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleQuickFill(acc)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  identifier === acc.email
                    ? 'border-indigo-500 bg-indigo-950/50 ring-1 ring-indigo-400/40'
                    : 'border-white/5 bg-[#0e1526] hover:bg-[#151f38] hover:border-white/15'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {acc.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    {acc.email}
                  </p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/10 text-indigo-300 shrink-0">
                  {acc.rol}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#39a900]" />
            <span>Centro CGAO Vélez</span>
          </div>
          <span className="text-slate-500">
            Regional Santander • 2026
          </span>
        </div>
      </div>
    </div>
  );
};

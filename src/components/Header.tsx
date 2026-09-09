import React, { useState } from 'react';
import { ScreenView, UserRole, UserAprendiz } from '../types';
import { CGAOLogo } from './CGAOLogo';
import { 
  User, 
  ShieldCheck, 
  LogOut, 
  UserCog, 
  DollarSign, 
  ChefHat, 
  FileSearch, 
  Lock,
  Menu,
  X,
  ShoppingBag,
  Clock,
  BarChart3,
  Package,
  Users,
  ChevronRight,
  ArrowRight,
  Shield,
  CheckCircle2,
  Sparkles,
  LockKeyhole
} from 'lucide-react';

interface HeaderProps {
  currentScreen: ScreenView;
  onSelectScreen: (screen: ScreenView) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  user: UserAprendiz;
  staffName?: string;
  staffEmail?: string;
  activeOrderCount: number;
}

interface PageDef {
  id: ScreenView;
  numero: string;
  label: string;
  description: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onSelectScreen,
  role,
  onRoleChange,
  user,
  staffName,
  staffEmail,
  activeOrderCount,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // All 8 core pages in the app with their full metadata and RBAC definitions
  const allPages: PageDef[] = [
    { 
      id: 'identificacion', 
      numero: '1',
      label: 'Identificación', 
      description: 'Kiosco de bienvenida y registro de aprendiz',
      icon: User,
      allowedRoles: ['Cliente', 'Admin', 'Cajero', 'Despachador', 'Auditor'] 
    },
    { 
      id: 'catalogo', 
      numero: '2',
      label: 'Catálogo & Menú', 
      description: 'Alimentos, combos y armado de pedido',
      icon: ShoppingBag,
      allowedRoles: ['Cliente', 'Admin', 'Cajero'] 
    },
    { 
      id: 'mi_turno', 
      numero: '3',
      label: 'Mi Turno', 
      description: 'Seguimiento de orden en tiempo real',
      badge: activeOrderCount > 0 ? '#042' : undefined,
      icon: Clock,
      allowedRoles: ['Cliente', 'Admin', 'Cajero', 'Despachador'] 
    },
    { 
      id: 'caja_pos', 
      numero: '4',
      label: 'Caja POS', 
      description: 'Facturación, cobro y arqueo de caja',
      icon: DollarSign,
      allowedRoles: ['Admin', 'Cajero', 'Auditor'] 
    },
    { 
      id: 'despacho', 
      numero: '5',
      label: 'Despacho', 
      description: 'Comandas de cocina y entrega a aprendices',
      icon: ChefHat,
      allowedRoles: ['Admin', 'Despachador', 'Cajero', 'Auditor'] 
    },
    { 
      id: 'metricas', 
      numero: '6',
      label: 'Métricas & Ventas', 
      description: 'Reportes analíticos, KPIs y balance financiero',
      icon: BarChart3,
      allowedRoles: ['Admin', 'Auditor'] 
    },
    { 
      id: 'inventario', 
      numero: '7',
      label: 'Inventario', 
      description: 'Gestión de catálogo, stock y costos',
      icon: Package,
      allowedRoles: ['Admin', 'Auditor'] 
    },
    { 
      id: 'usuarios', 
      numero: '8',
      label: 'Usuarios & RBAC', 
      description: 'Directorio, monederos y control de acceso',
      icon: Users,
      allowedRoles: ['Admin', 'Auditor'] 
    },
    { 
      id: 'auditoria', 
      numero: '9',
      label: 'Auditoría', 
      description: 'Supervisión de cambios y trazabilidad del personal',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Auditor'] 
    },
  ];

  // Visible in the top bar according to current role
  const visibleTopTabs = allPages.filter((page) => page.allowedRoles.includes(role));

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'Admin': 
        return { text: 'Administrador', color: 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40', icon: UserCog };
      case 'Cajero': 
        return { text: 'Cajero POS', color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40', icon: DollarSign };
      case 'Despachador': 
        return { text: 'Despachador', color: 'text-amber-300 bg-amber-950/60 border-amber-500/40', icon: ChefHat };
      case 'Auditor': 
        return { text: 'Auditor (Lectura)', color: 'text-sky-300 bg-sky-950/60 border-sky-500/40', icon: FileSearch };
      default: 
        return { text: 'Aprendiz / Kiosco', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30', icon: User };
    }
  };

  const roleInfo = getRoleBadge(role);
  const RoleIcon = roleInfo.icon;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090d16]/95 backdrop-blur-2xl">
        <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left Corner: Clean institutional logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectScreen('identificacion')}
              className="flex items-center focus:outline-none text-left cursor-pointer hover:opacity-95 transition-opacity"
              title="Cafetería SENA CGAO - Ir a Inicio"
            >
              <CGAOLogo size="md" showText={true} />
            </button>

            {/* Subtle regional chip */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121a2c] border border-white/10 text-[11px] text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#39a900] animate-pulse"></span>
              <span>Vélez, Santander</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">2026</span>
            </div>
          </div>

          {/* Active Screen Indicator (Replaces buttons in top bar so everything is in the lateral menu) */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#101728] border border-white/10 shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium">Módulo:</span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              {allPages.find((p) => p.id === currentScreen)?.label || 'Cafetería CGAO'}
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-[11px] text-indigo-300 font-mono">
              #{allPages.find((p) => p.id === currentScreen)?.numero || '0'}
            </span>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active role badge with quick indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.text}</span>
            </div>

            {/* If staff is logged in, show logout */}
            {role !== 'Cliente' ? (
              <button
                onClick={() => {
                  onRoleChange('Cliente');
                  onSelectScreen('identificacion');
                }}
                title="Cerrar sesión de personal y volver a modo Kiosco"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            ) : (
              <button
                onClick={() => onSelectScreen('acceso_personal')}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141b2b] hover:bg-[#1a243a] border border-white/10 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
                title="Acceso para funcionarios y personal"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Acceso Personal</span>
              </button>
            )}

            {/* Menu button to open lateral drawer */}
            <button
              id="btn-abrir-menu-lateral"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/40 active:scale-95 cursor-pointer"
              title="Abrir menú lateral con todas las vistas de la app"
            >
              <Menu className="w-4 h-4" />
              <span className="font-display">Menú</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                {visibleTopTabs.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* LATERAL MENU DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Lateral Slide-Over Panel */}
          <aside 
            className="relative w-full max-w-sm sm:w-96 h-full bg-[#0d1322] border-l border-white/15 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#11192e]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-display">
                    Navegación del Sistema
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Todas las vistas de la Cafetería CGAO
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Session Card */}
            <div className="p-3.5 border-b border-white/10 bg-[#090e1a]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Perfil Activo
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.color}`}>
                  {roleInfo.text}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold font-display shrink-0 text-xs">
                  {role === 'Cliente' ? user.nombre.charAt(0) : staffName?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {role === 'Cliente' ? user.nombre : staffName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {role === 'Cliente' ? `Ficha: ${user.ficha} • ${user.documento}` : staffEmail || 'admin@sena.edu.co'}
                  </p>
                </div>
              </div>
            </div>

            {/* List of All 8 Pages */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-thin">
              <div className="px-1 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Vistas de la Aplicación ({allPages.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {visibleTopTabs.length} con acceso
                </span>
              </div>

              {allPages.map((page) => {
                const isActive = currentScreen === page.id;
                const hasAccess = page.allowedRoles.includes(role);
                const PageIcon = page.icon;

                return (
                  <button
                    key={page.id}
                    id={`drawer-nav-${page.id}`}
                    onClick={() => {
                      if (hasAccess) {
                        onSelectScreen(page.id);
                        setSidebarOpen(false);
                      } else {
                        // If user clicks a restricted screen, automatically elevate to Admin so they can view it
                        onRoleChange('Admin');
                        onSelectScreen(page.id);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-500/20 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-indigo-400/30'
                        : hasAccess
                        ? 'bg-[#11192e]/60 border-white/5 hover:bg-[#16213b] hover:border-white/20'
                        : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md'
                            : hasAccess
                            ? 'bg-white/5 text-slate-300 group-hover:bg-indigo-600/20 group-hover:text-indigo-300'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        <PageIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            #{page.numero}
                          </span>
                          <span
                            className={`text-xs font-bold font-display ${
                              isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {page.label}
                          </span>
                          {page.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 uppercase">
                              {page.badge}
                            </span>
                          )}
                          {!hasAccess && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[9px] font-medium border border-amber-500/20">
                              <LockKeyhole className="w-2.5 h-2.5" />
                              <span>Personal</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {page.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive
                          ? 'text-indigo-400 translate-x-0.5'
                          : 'text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3.5 border-t border-white/10 bg-[#0c1220] space-y-2.5">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  onSelectScreen('acceso_personal');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#17223b] hover:bg-[#1f2d4e] border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Acceso de Personal CGAO</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>CGAO Vélez • Regional Santander</span>
                <span>8 Vistas Activas</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

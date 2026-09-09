import React, { useState, useMemo } from 'react';
import { AppUser, UserRole } from '../types';
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Mail, 
  UserCog, 
  DollarSign, 
  ChefHat, 
  FileSearch, 
  User,
  X,
  Save,
  Wallet,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface UsuariosScreenProps {
  users: AppUser[];
  userRole?: UserRole;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
}

export const UsuariosScreen: React.FC<UsuariosScreenProps> = ({
  users,
  userRole = 'Admin',
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const isReadOnly = userRole === 'Auditor';

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState<Partial<AppUser>>({
    documento: '',
    tipoDoc: 'C.C. Cédula',
    nombre: '',
    email: '',
    rol: 'Cliente',
    ficha: '',
    programa: '',
    jornada: 'Jornada Diurna 06:00 - 13:00',
    turnoAlmuerzo: 'Bloque B – 12:15',
    saldoMonedero: 0,
    subsidioActivo: false,
    activo: true,
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.documento.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.ficha && u.ficha.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.programa && u.programa.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = roleFilter === 'todos' || u.rol === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // KPIs
  const totalUsuarios = users.length;
  const totalAprendices = users.filter((u) => u.rol === 'Cliente').length;
  const totalPersonal = users.filter((u) => u.rol !== 'Cliente').length;

  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setEditingUser(null);
    setFormData({
      id: `usr-${Date.now()}`,
      documento: '',
      tipoDoc: 'C.C. Cédula',
      nombre: '',
      email: '',
      rol: 'Cliente',
      ficha: '2671234',
      programa: 'ADSO CGAO',
      jornada: 'Jornada Diurna 06:00 - 13:00',
      turnoAlmuerzo: 'Bloque B – 12:15',
      saldoMonedero: 25000,
      subsidioActivo: false,
      activo: true,
      ultimoAcceso: 'Nunca',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    if (isReadOnly) return;
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim() || !formData.documento?.trim()) {
      showToast('Nombre y documento son obligatorios.');
      return;
    }

    const userToSave: AppUser = {
      id: editingUser ? editingUser.id : formData.id || `usr-${Date.now()}`,
      documento: formData.documento || '',
      tipoDoc: formData.tipoDoc || 'C.C. Cédula',
      nombre: formData.nombre || '',
      email: formData.email || `${formData.documento}@sena.edu.co`,
      rol: (formData.rol as UserRole) || 'Cliente',
      ficha: formData.ficha || '',
      programa: formData.programa || '',
      jornada: formData.jornada || 'Jornada Diurna',
      turnoAlmuerzo: formData.turnoAlmuerzo || 'Bloque B – 12:15',
      saldoMonedero: Number(formData.saldoMonedero) || 0,
      subsidioActivo: !!formData.subsidioActivo,
      activo: formData.activo !== undefined ? formData.activo : true,
      ultimoAcceso: editingUser?.ultimoAcceso || 'Hoy',
    };

    if (editingUser) {
      onUpdateUser(userToSave);
      showToast(`Usuario actualizado: ${userToSave.nombre} (${userToSave.rol})`);
    } else {
      onAddUser(userToSave);
      showToast(`Usuario registrado: ${userToSave.nombre}`);
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = (user: AppUser) => {
    if (isReadOnly) return;
    onUpdateUser({
      ...user,
      activo: !user.activo,
    });
    showToast(`Estado de usuario actualizado: ${user.nombre} (${!user.activo ? 'Activo' : 'Inactivo'})`);
  };

  const handleDelete = (id: string, nombre: string) => {
    if (isReadOnly) return;
    if (window.confirm(`¿Confirmas la eliminación del usuario ${nombre}?`)) {
      onDeleteUser(id);
      showToast(`Usuario eliminado del sistema: ${nombre}`);
    }
  };

  const getRoleBadge = (rol: UserRole) => {
    switch (rol) {
      case 'Admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 uppercase flex items-center gap-1"><UserCog className="w-3 h-3" /> Admin</span>;
      case 'Cajero':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3" /> Cajero</span>;
      case 'Despachador':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 uppercase flex items-center gap-1"><ChefHat className="w-3 h-3" /> Despacho</span>;
      case 'Auditor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/40 uppercase flex items-center gap-1"><FileSearch className="w-3 h-3" /> Auditor</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/10 uppercase flex items-center gap-1"><User className="w-3 h-3" /> Cliente (Aprendiz)</span>;
    }
  };

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel-elevated bg-[#152438]/95 border border-indigo-500/50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#39a900]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase font-display">
              CONTROL DE IDENTIDAD & PERMISOS
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Centro CGAO Vélez • Regional Santander 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Gestión de Usuarios & Roles
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Administración centralizada de credenciales, asignación de permisos por rol (RBAC), monedero institucional y estado de cuentas.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          {isReadOnly && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Modo Auditor (Solo Lectura)</span>
            </div>
          )}

          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL USUARIOS</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-display">
              {totalUsuarios} <span className="text-xs text-slate-400 font-medium">cuentas</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Registrados en el sistema CGAO</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">APRENDICES / CLIENTES</span>
            <User className="w-4 h-4 text-[#39a900]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-display">
              {totalAprendices}{' '}
              <span className="text-xs text-emerald-400 font-semibold">activos</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Vinculados a fichas de formación</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">PERSONAL / FUNCIONARIOS</span>
            <UserCog className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-400 font-display">
              {totalPersonal}{' '}
              <span className="text-xs text-slate-400 font-medium">operativos</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Admin, Cajeros, Despacho, Auditor</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, documento, correo, ficha..."
            className="w-full bg-[#0c121e] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter by Role Pills */}
        <div className="flex items-center gap-1 bg-[#0c121e] p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
          {['todos', 'Admin', 'Cajero', 'Despachador', 'Auditor', 'Cliente'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg capitalize cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === r ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'todos' ? 'Todos los Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel-elevated rounded-2xl border border-white/15 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0c121e] text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Usuario / Nombre</th>
                <th className="py-3 px-3">Documento</th>
                <th className="py-3 px-3 text-center">Rol Asignado</th>
                <th className="py-3 px-3">Programa / Dependencia</th>
                <th className="py-3 px-3 text-right">Saldo Monedero</th>
                <th className="py-3 px-3 text-center">Estado</th>
                {!isReadOnly && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  {/* Name and Email */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                        {u.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{u.nombre}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Document */}
                  <td className="py-3 px-3 font-mono font-medium text-slate-300">
                    <span className="text-white block">{u.documento}</span>
                    <span className="text-[10px] text-slate-500">{u.tipoDoc}</span>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-3 text-center">
                    {getRoleBadge(u.rol)}
                  </td>

                  {/* Program / Ficha */}
                  <td className="py-3 px-3">
                    <span className="text-slate-200 block truncate max-w-[180px]">
                      {u.programa || 'Personal Administrativo'}
                    </span>
                    {u.ficha && (
                      <span className="text-[10px] font-mono text-indigo-300">
                        Ficha {u.ficha}
                      </span>
                    )}
                  </td>

                  {/* Monedero */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    ${(u.saldoMonedero || 0).toLocaleString('es-CO')}
                  </td>

                  {/* Active Status */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isReadOnly}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        u.activo
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900/60'
                          : 'bg-red-950/60 text-red-400 border border-red-500/20 hover:bg-red-900/60'
                      }`}
                    >
                      {u.activo ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Bloqueado</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  {!isReadOnly && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                          title="Editar usuario y rol"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.nombre)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel-elevated rounded-2xl max-w-lg w-full p-6 border border-white/20 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-extrabold text-white font-display">
                {editingUser ? `Editar Usuario: ${editingUser.nombre}` : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              {/* Rol Asignado */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Rol en el Sistema CGAO *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="Cliente">Cliente (Aprendiz / Kiosco)</option>
                  <option value="Cajero">Cajero (Caja POS & Recaudo)</option>
                  <option value="Despachador">Despachador (Módulo Despacho)</option>
                  <option value="Auditor">Auditor (Control Interno / Solo Lectura)</option>
                  <option value="Admin">Admin (Administrador Total)</option>
                </select>
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Laura Camila Gómez"
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tipo Doc & Documento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.tipoDoc}
                    onChange={(e) => setFormData({ ...formData, tipoDoc: e.target.value })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="C.C. Cédula">C.C. Cédula</option>
                    <option value="T.I. Tarjeta Identidad">T.I. Tarjeta Identidad</option>
                    <option value="P.E.P.">P.E.P.</option>
                    <option value="C.E. Extranjería">C.E. Extranjería</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    placeholder="1098..."
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correo Institucional (@sena.edu.co / @soy.sena.edu.co)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@sena.edu.co"
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Ficha & Programa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Ficha SENA (Si aplica)
                  </label>
                  <input
                    type="text"
                    value={formData.ficha}
                    onChange={(e) => setFormData({ ...formData, ficha: e.target.value })}
                    placeholder="2671234"
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Programa / Área
                  </label>
                  <input
                    type="text"
                    value={formData.programa}
                    onChange={(e) => setFormData({ ...formData, programa: e.target.value })}
                    placeholder="ADSO, Cocina..."
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Saldo Monedero */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Saldo Monedero Institucional (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-mono">
                    $
                  </div>
                  <input
                    type="number"
                    value={formData.saldoMonedero}
                    onChange={(e) => setFormData({ ...formData, saldoMonedero: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Activo / Inactivo */}
              <div>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0c121e] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded accent-indigo-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-300">
                    Cuenta activa y habilitada para operar en Cafetería CGAO
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-display flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

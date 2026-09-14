import { AppUser } from '../types';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'admin-1098765432',
    documento: '1098765432',
    tipoDoc: 'C.C. Cédula',
    nombre: 'Administrador SENA CGAO',
    email: 'admin@sena.edu.co',
    rol: 'Admin',
    programa: 'Administración Cafetería CGAO',
    jornada: 'Jornada Completa',
    saldoMonedero: 0,
    subsidioActivo: false,
    activo: true,
    ultimoAcceso: 'Pendiente',
  },
];

import { POSOrder } from '../types';

// Órdenes POS vacías: se cargan desde Supabase al montar la aplicación.
export const INITIAL_POS_ORDERS: POSOrder[] = [];

export const RECENT_PAID_ORDERS: {
  id: string;
  turno: string;
  nombre: string;
  hora: string;
  metodo: string;
  total: number;
  fecha: string;
}[] = [];
import { POSOrder } from '../types';

export const INITIAL_POS_ORDERS: POSOrder[] = [];
export const RECENT_PAID_ORDERS: { turno: string; cliente: string; total: number; metodo: string; hora: string }[] = [];

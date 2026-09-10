import { AuditLog } from '../types';

// Registros de auditoría vacíos: se cargan desde Supabase al montar.
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
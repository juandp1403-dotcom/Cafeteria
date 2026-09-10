import { AppUser } from '../types';

// Directorio de usuarios vacío: se carga desde Supabase
// (fetchUsersFromSupabase) al montar la aplicación.
export const INITIAL_USERS: AppUser[] = [];
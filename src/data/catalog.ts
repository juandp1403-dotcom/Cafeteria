import { ProductItem } from '../types';

// Catálogo semilla vacío: los productos se cargan desde Supabase
// (fetchProductsFromSupabase) al montar la aplicación.
export const INITIAL_PRODUCTS: ProductItem[] = [];
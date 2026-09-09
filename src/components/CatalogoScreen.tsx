import React, { useState, useMemo } from 'react';
import { ProductItem, CartItem, UserAprendiz } from '../types';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Flame,
  Banknote,
  Wallet
} from 'lucide-react';
import { soundEngine } from '../utils/sound';

interface CatalogoScreenProps {
  user: UserAprendiz;
  products: ProductItem[];
  cart: CartItem[];
  onAddToCart: (product: ProductItem) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onConfirmOrder: (paymentMethod: 'Billetera Digital SENA' | 'Efectivo' | 'Nequi' | 'Datáfono') => void;
}

export const CatalogoScreen: React.FC<CatalogoScreenProps> = ({
  user,
  products,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onConfirmOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'nequi'>('efectivo');

  const categories = [
    { id: 'todos', label: `Todos (${products.length})` },
    { id: 'comida_rapida', label: 'Comida Rápida' },
    { id: 'bebidas_frias', label: 'Bebidas Frías' },
    { id: 'cafe_calientes', label: 'Café & Calientes' },
    { id: 'combos_sena', label: 'Combos SENA' },
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchSearch =
        prod.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.subcategoria && prod.subcategoria.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'todos' || prod.categoria === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Calculations
  const total = cart.reduce((acc, item) => acc + item.product.precio * item.cantidad, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

  const handleConfirm = () => {
    if (cart.length === 0) return;
    const mappedPayment = paymentMethod === 'efectivo' ? 'Efectivo' : 'Nequi';

    soundEngine.playCashRegisterBeep();
    onConfirmOrder(mappedPayment);
  };

  return (
    <div className="max-w-[94rem] mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider text-[#39a900] uppercase font-display">
              TERMINAL GASTRONÓMICA DIGITAL
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Centro CGAO Vélez • Regional Santander 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Catálogo de Alimentos CGAO
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Realiza tu selección previa al receso. El sistema reserva tus ingredientes y envía la comanda directamente a preparación.
          </p>
        </div>

        {/* Right Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#11221b] border border-emerald-500/30 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#39a900] animate-pulse" />
            <span className="text-slate-300 font-medium">Línea de Despacho</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-semibold">Fluida y Operativa</span>
          </div>
        </div>
      </div>

      {/* Main Layout: 2 Columns (Catalog on left, Cart tray on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search, Filters & Food Grid */}
        <div className="lg:col-span-8 space-y-5">
          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empanadas, bebidas, combos, cafés..."
                className="w-full bg-[#0d1424] border border-white/10 focus:border-indigo-500 rounded-xl pl-10 pr-12 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-white/20'
                        : 'bg-[#0f172a] text-slate-300 hover:text-white hover:bg-[#1e293b] border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Food Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id);
              const isLowStock = product.stock > 0 && product.stock <= (product.alertaStock || 5);

              return (
                <div
                  key={product.id}
                  className={`glass-card rounded-2xl overflow-hidden flex flex-col justify-between group ${
                    product.stock === 0 ? 'opacity-65' : ''
                  }`}
                >
                  {/* Food Image with Tag and Stock */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1422] via-transparent to-black/40" />

                    {/* Stock status pill */}
                    <div className="absolute top-2.5 left-2.5">
                      {product.stock === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Agotado
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Últimas {product.stock} un.
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#39a900]" />
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>

                    {/* Floating Price Pill */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-extrabold text-sm font-display shadow-lg">
                        ${product.precio.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider font-display">
                          {product.tag || product.subcategoria}
                        </span>
                        {product.subcategoria && (
                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[100px]">
                            {product.subcategoria}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white font-display line-clamp-1">
                        {product.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {product.descripcion}
                      </p>
                    </div>

                    {/* Card Footer: Calories & Add button */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>~{product.calorias || 200} kcal</span>
                      </div>

                      {product.stock === 0 ? (
                        <button
                          disabled
                          className="py-1.5 px-3 rounded-lg bg-white/5 text-slate-500 text-xs font-semibold cursor-not-allowed"
                        >
                          Agotado
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-1.5 bg-[#172036] border border-indigo-500/40 rounded-lg p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(product.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white px-1">
                            {inCart.cantidad}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(product.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart(product)}
                          className="py-1.5 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white text-xs font-bold font-display flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: "Mi Bandeja" Cart Tray */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 glass-panel-elevated rounded-2xl p-5 border border-white/15 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#39a900]" />
                <div>
                  <h2 className="text-base font-extrabold text-white font-display">
                    Mi Bandeja de Pedido
                  </h2>
                  <span className="text-[10px] text-slate-400">
                    Centro CGAO Vélez
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium">Tu bandeja está vacía</p>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                  Agrega alimentos del menú para gestionar tu pedido.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-xl bg-[#0f172a]/80 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.product.nombre}
                      </h4>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        ${(item.product.precio * item.cantidad).toLocaleString('es-CO')} COP
                      </span>
                    </div>

                    {/* Stepper controls */}
                    <div className="flex items-center gap-1.5 bg-[#162035] border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-bold text-white px-1">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemoveFromCart(item.product.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Eliminar de la bandeja"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Modalidad de Cancelación / Payment selector */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Modalidad de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'efectivo'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(57,169,0,0.3)] ring-1 ring-emerald-400/40'
                      : 'bg-[#0e1626] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-[#152038]'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Caja Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('nequi')}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'nequi'
                      ? 'bg-sky-950/70 border-sky-500 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.3)] ring-1 ring-sky-400/40'
                      : 'bg-[#0e1626] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-[#152038]'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-sky-400" />
                  <span>Nequi / Transferencia</span>
                </button>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal Pedido</span>
                <span className="font-semibold text-white">
                  ${total.toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    TOTAL A LIQUIDAR
                  </span>
                  <span className="text-[10px] text-slate-500">IVA 0% Académico</span>
                </div>
                <span className="text-2xl font-extrabold text-[#39a900] font-display">
                  ${total.toLocaleString('es-CO')} <span className="text-xs font-semibold text-emerald-300">COP</span>
                </span>
              </div>
            </div>

            {/* Action button - Solid Celestial (Sky) Blue as requested */}
            <button
              onClick={handleConfirm}
              disabled={cart.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-display font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
                cart.length > 0
                  ? 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] border border-sky-300/30 cursor-pointer active:scale-[0.99]'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Confirmar Pedido</span>
            </button>

            {/* Note below button */}
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Tu comanda se sincroniza en tiempo real con la línea de despacho de cocina.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import { ProductItem, UserRole, BajaItem } from '../types';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  AlertTriangle, 
  PackageX, 
  CheckCircle2, 
  Layers, 
  DollarSign, 
  Flame, 
  ShieldAlert,
  X,
  Save,
  Tag,
  Upload,
  FileUp,
  Download,
  Calendar,
  User,
  Clock,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { exportInventoryReport } from '../utils/exportExcel';
import { assets } from '../assets/images';

interface InventarioScreenProps {
  products: ProductItem[];
  userRole?: UserRole;
  staffName?: string;
  onAddProduct: (product: ProductItem) => void;
  onUpdateProduct: (product: ProductItem) => void;
  onDeleteProduct: (productId: string) => void;
  bajas: BajaItem[];
  onAddBaja: (baja: BajaItem) => void;
  onImportProducts?: (imported: ProductItem[]) => void;
}

export const InventarioScreen: React.FC<InventarioScreenProps> = ({
  products,
  userRole = 'Admin',
  staffName = 'Carlos Mendoza (Admin)',
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  bajas,
  onAddBaja,
  onImportProducts,
}) => {
  const isReadOnly = userRole === 'Auditor';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [filterStockStatus, setFilterStockStatus] = useState<'todos' | 'agotados' | 'alerta' | 'normal'>('todos');
  
  // Filter for Bajas table (defaults to 'hoy' as requested)
  const [bajasFilter, setBajasFilter] = useState<string>('hoy');

  // Modal state for Add / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formData, setFormData] = useState<Partial<ProductItem>>({
    nombre: '',
    descripcion: '',
    precio: 3500,
    costo: 1800,
    stock: 20,
    alertaStock: 8,
    categoria: 'comida_rapida',
    categoriaLabel: 'Comida Rápida',
    subcategoria: 'Fritos Tradicionales',
    imagen: assets.empanadas,
    calorias: 250,
    tag: 'ESPECIAL CGAO',
  });

  // Modal state for "Dar de Baja"
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaProductId, setBajaProductId] = useState<string>(products[0]?.id || '');
  const [bajaCantidad, setBajaCantidad] = useState<number>(1);
  const [bajaMotivo, setBajaMotivo] = useState<string>('Fecha de vencimiento caducada');
  const [bajaObservaciones, setBajaObservaciones] = useState<string>('');

  // Modal state for "Importar Excel"
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<ProductItem>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalItems = products.length;
  const valorTotalInventario = products.reduce((acc, p) => acc + p.costo * p.stock, 0);
  const totalAgotados = products.filter((p) => p.stock === 0 || p.agotado).length;
  const totalAlertaAmarilla = products.filter((p) => p.stock > 0 && p.stock <= (p.alertaStock || 8)).length;

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchSearch =
        prod.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.subcategoria && prod.subcategoria.toLowerCase().includes(searchQuery.toLowerCase())) ||
        prod.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = filterCategory === 'todos' || prod.categoria === filterCategory;

      let matchStock = true;
      if (filterStockStatus === 'agotados') matchStock = prod.stock === 0 || !!prod.agotado;
      else if (filterStockStatus === 'alerta') matchStock = prod.stock > 0 && prod.stock <= (prod.alertaStock || 8);
      else if (filterStockStatus === 'normal') matchStock = prod.stock > (prod.alertaStock || 8);

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchQuery, filterCategory, filterStockStatus]);

  // Current date & week identifier
  const todayDateStr = new Date().toLocaleDateString('es-CO');
  const currentWeekTag = 'Semana 37 (8 - 14 Sep 2026)';

  // Filtered bajas list - defaults to showing only today's bajas
  const filteredBajas = useMemo(() => {
    if (bajasFilter === 'hoy') {
      return bajas.filter((b) => {
        if (b.fecha === todayDateStr) return true;
        if (b.timestamp) {
          const bDate = new Date(b.timestamp);
          const now = new Date();
          return (
            bDate.getFullYear() === now.getFullYear() &&
            bDate.getMonth() === now.getMonth() &&
            bDate.getDate() === now.getDate()
          );
        }
        return false;
      });
    }
    return bajas;
  }, [bajas, bajasFilter, todayDateStr]);

  // Bajas KPIs
  const totalBajasCount = filteredBajas.length;
  const totalBajasUnidades = filteredBajas.reduce((acc, b) => acc + b.cantidad, 0);
  const totalBajasCosto = filteredBajas.reduce((acc, b) => acc + b.costoTotal, 0);

  // Selected product for Baja
  const selectedProductForBaja = useMemo(() => {
    return products.find((p) => p.id === bajaProductId) || products[0];
  }, [products, bajaProductId]);

  // Open modal for new product
  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setEditingProduct(null);
    setFormData({
      id: `prod-${Date.now()}`,
      nombre: '',
      descripcion: '',
      precio: 4000,
      costo: 2000,
      stock: 25,
      alertaStock: 8,
      categoria: 'comida_rapida',
      categoriaLabel: 'Comida Rápida',
      subcategoria: 'Snacks y Calientes',
      imagen: assets.empanadas,
      calorias: 280,
      tag: 'COCINA CGAO',
      agotado: false,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing product
  const handleOpenEdit = (product: ProductItem) => {
    if (isReadOnly) return;
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  // Handle local image upload from device
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setFormData((prev) => ({ ...prev, imagen: result }));
      showToast('Imagen cargada localmente desde tu equipo con éxito.');
    };
    reader.readAsDataURL(file);
  };

  // Save product from modal
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      showToast('El nombre del producto es obligatorio.');
      return;
    }

    const itemToSave: ProductItem = {
      id: editingProduct ? editingProduct.id : formData.id || `prod-${Date.now()}`,
      nombre: formData.nombre || 'Nuevo Producto',
      descripcion: formData.descripcion || 'Sin descripción',
      precio: Number(formData.precio) || 0,
      costo: Number(formData.costo) || 0,
      stock: Number(formData.stock) || 0,
      alertaStock: Number(formData.alertaStock) || 8,
      categoria: formData.categoria || 'comida_rapida',
      categoriaLabel:
        formData.categoria === 'comida_rapida'
          ? 'Comida Rápida'
          : formData.categoria === 'bebidas_frias'
          ? 'Bebidas Frías'
          : formData.categoria === 'cafe_calientes'
          ? 'Café & Calientes'
          : 'Combos SENA',
      subcategoria: formData.subcategoria || 'General',
      imagen: formData.imagen || assets.empanadas,
      calorias: Number(formData.calorias) || 200,
      tag: formData.tag || 'CGAO',
      agotado: Number(formData.stock) === 0,
    };

    if (editingProduct) {
      onUpdateProduct(itemToSave);
      showToast(`Producto "${itemToSave.nombre}" actualizado correctamente.`);
    } else {
      onAddProduct(itemToSave);
      showToast(`Producto "${itemToSave.nombre}" añadido al inventario.`);
    }

    setIsModalOpen(false);
  };

  // Open "Dar de Baja" modal
  const handleOpenBajaModal = () => {
    if (isReadOnly) return;
    if (products.length === 0) {
      showToast('No hay productos disponibles en el inventario para dar de baja.');
      return;
    }
    setBajaProductId(products[0].id);
    setBajaCantidad(1);
    setBajaMotivo('Fecha de vencimiento caducada');
    setBajaObservaciones('');
    setIsBajaModalOpen(true);
  };

  // Confirm "Dar de Baja"
  const handleConfirmBaja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBaja) return;

    if (bajaCantidad <= 0) {
      showToast('La cantidad debe ser mayor a 0 unidades.');
      return;
    }

    if (bajaCantidad > selectedProductForBaja.stock) {
      showToast(`No puedes dar de baja más del stock actual (${selectedProductForBaja.stock} unidades).`);
      return;
    }

    const costoTotalPerdida = bajaCantidad * selectedProductForBaja.costo;

    const newBaja: BajaItem = {
      id: `baja-${Date.now()}`,
      productoId: selectedProductForBaja.id,
      productoNombre: selectedProductForBaja.nombre,
      categoria: selectedProductForBaja.categoria,
      cantidad: bajaCantidad,
      costoUnitario: selectedProductForBaja.costo,
      costoTotal: costoTotalPerdida,
      motivo: bajaMotivo,
      semana: currentWeekTag,
      fecha: new Date().toLocaleDateString('es-CO'),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      responsable: staffName,
      observaciones: bajaObservaciones.trim() || 'Baja operativa registrada por personal.',
    };

    // Deduct stock automatically
    const updatedProduct: ProductItem = {
      ...selectedProductForBaja,
      stock: selectedProductForBaja.stock - bajaCantidad,
      agotado: selectedProductForBaja.stock - bajaCantidad === 0,
    };

    onUpdateProduct(updatedProduct);
    onAddBaja(newBaja);

    setIsBajaModalOpen(false);
    showToast(`Baja registrada: ${bajaCantidad} u de "${selectedProductForBaja.nombre}" descargadas de inventario.`);
  };

  // Open "Importar Excel" modal
  const handleOpenImportModal = () => {
    if (isReadOnly) return;
    setImportFileName(null);
    setImportPreview([]);
    setImportError(null);
    setIsImportModalOpen(true);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const headers = ['Nombre', 'Categoria', 'Subcategoria', 'Precio', 'Costo', 'Stock', 'AlertaStock', 'Calorias', 'Tag', 'Descripcion'];
    const sampleRows = [
      ['Empanada de Pollo CGAO', 'comida_rapida', 'Fritos', '3800', '1900', '30', '10', '260', 'CRUJIENTE', 'Empanada rellena de pollo desmechado con finas hierbas'],
      ['Jugo de Mora 16oz', 'bebidas_frias', 'Jugos Naturales', '4200', '1800', '20', '8', '140', '100% PULPA', 'Mora fresca de Santander licuada al instante'],
      ['Capuchino Veleño', 'cafe_calientes', 'Cafetería Especial', '3500', '1200', '25', '6', '110', 'BARISTA CGAO', 'Espresso doble con leche texturizada y ralladura de bocadillo'],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Plantilla_Inventario_CGAO.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Plantilla CSV descargada exitosamente.');
  };

  // Handle Excel / CSV file selection and parsing
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        
        if (lines.length <= 1) {
          setImportError('El archivo no contiene filas de datos para importar.');
          return;
        }

        // Parse CSV rows (handles quotes and commas or semicolons)
        const delimiter = lines[0].includes(';') ? ';' : ',';
        const parsedItems: Partial<ProductItem>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const cols = row.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());

          if (cols[0]) {
            parsedItems.push({
              id: `prod-imp-${Date.now()}-${i}`,
              nombre: cols[0] || `Producto Importado ${i}`,
              categoria: (cols[1] as any) || 'comida_rapida',
              categoriaLabel: cols[1] === 'bebidas_frias' ? 'Bebidas Frías' : cols[1] === 'cafe_calientes' ? 'Café & Calientes' : 'Comida Rápida',
              subcategoria: cols[2] || 'Insumo',
              precio: Number(cols[3]) || 3500,
              costo: Number(cols[4]) || 1800,
              stock: Number(cols[5]) || 20,
              alertaStock: Number(cols[6]) || 8,
              calorias: Number(cols[7]) || 200,
              tag: cols[8] || 'IMPORTADO',
              descripcion: cols[9] || 'Producto cargado desde archivo Excel institucional.',
              imagen: assets.empanadas,
              agotado: false,
            });
          }
        }

        if (parsedItems.length === 0) {
          setImportError('No se pudieron reconocer columnas válidas en el archivo.');
        } else {
          setImportPreview(parsedItems);
        }
      } catch (err) {
        setImportError('Error al leer el archivo. Asegúrate de usar el formato de la plantilla CSV/Excel.');
      }
    };

    reader.readAsText(file);
  };

  // Confirm Excel Import
  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;

    if (onImportProducts) {
      const fullProducts: ProductItem[] = importPreview.map((item) => ({
        id: item.id || `prod-${Date.now()}-${Math.random()}`,
        nombre: item.nombre || 'Producto Importado',
        descripcion: item.descripcion || 'Sin descripción',
        precio: item.precio || 3000,
        costo: item.costo || 1500,
        stock: item.stock || 20,
        alertaStock: item.alertaStock || 8,
        categoria: item.categoria || 'comida_rapida',
        categoriaLabel: item.categoriaLabel || 'Comida Rápida',
        subcategoria: item.subcategoria || 'General',
        imagen: item.imagen || assets.empanadas,
        calorias: item.calorias || 200,
        tag: item.tag || 'EXCEL CGAO',
        agotado: false,
      }));
      onImportProducts(fullProducts);
    } else {
      // Fallback: Add one by one
      importPreview.forEach((item) => {
        onAddProduct(item as ProductItem);
      });
    }

    setIsImportModalOpen(false);
    showToast(`Se importaron exitosamente ${importPreview.length} productos al catálogo.`);
  };

  // Trigger Excel Export (Multi-sheet: Inventario + Bajas)
  const handleExportExcel = () => {
    exportInventoryReport(products, bajas);
    showToast('Reporte Excel generado con 2 hojas: Catálogo Inventario y Registro de Bajas.');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Floating Toast Notification */}
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
              ADMINISTRACIÓN DE STOCK & INSUMOS
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Centro CGAO Vélez • Santander</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Gestión de Inventario CGAO
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Control integral de existencias, importación masiva por Excel, bajas con justificación técnica y seguimiento semanal.
          </p>
        </div>

        {/* Action Buttons: Importar Excel, Dar de Baja, Exportar Excel, Nuevo Producto */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isReadOnly && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Modo Auditor (Solo Lectura)</span>
            </div>
          )}

          {/* Importar Excel Button */}
          {!isReadOnly && (
            <button
              onClick={handleOpenImportModal}
              className="py-2.5 px-3.5 rounded-xl bg-[#131d31] hover:bg-[#1c2a47] border border-white/10 hover:border-indigo-500/50 text-slate-200 hover:text-white text-xs font-bold font-display flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Importar catálogo masivo desde archivo Excel (.xlsx / .csv)"
            >
              <FileUp className="w-4 h-4 text-indigo-400" />
              <span>Importar Excel</span>
            </button>
          )}

          {/* Dar de Baja Button */}
          {!isReadOnly && (
            <button
              onClick={handleOpenBajaModal}
              className="py-2.5 px-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold font-display flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-950/40"
              title="Descargar producto de inventario por merma, rotura o vencimiento"
            >
              <PackageX className="w-4 h-4 text-rose-400" />
              <span>Dar de Baja</span>
            </button>
          )}

          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Inventario (Excel)</span>
          </button>

          {/* Nuevo Producto */}
          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL PRODUCTOS (SKU)</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-display">
              {totalItems} <span className="text-xs text-slate-400 font-medium">referencias</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Activas en el menú de la cafetería</p>
          </div>
        </div>

        {/* Valor de Inventario al Costo */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">VALORIZACIÓN COSTO</span>
            <DollarSign className="w-4 h-4 text-[#39a900]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-display">
              ${valorTotalInventario.toLocaleString('es-CO')}{' '}
              <span className="text-xs text-emerald-400 font-semibold">COP</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Capital en almacén y refrigeración</p>
          </div>
        </div>

        {/* Productos Agotados */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/20 bg-red-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-red-300">
            <span className="font-bold uppercase tracking-wider text-[10px]">PRODUCTOS AGOTADOS</span>
            <PackageX className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-red-400 font-display">
              {totalAgotados}{' '}
              <span className="text-xs text-red-300 font-medium">en cero</span>
            </span>
            <p className="text-[10px] text-red-300/80 mt-1">Bloqueados para compra en kiosco</p>
          </div>
        </div>

        {/* Alerta Amarilla */}
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="font-bold uppercase tracking-wider text-[10px]">ALERTA AMARILLA</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-display">
              {totalAlertaAmarilla}{' '}
              <span className="text-xs text-amber-300 font-medium">críticos</span>
            </span>
            <p className="text-[10px] text-amber-300/80 mt-1">Existencias inferiores a umbral mínimo</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código, categoría, subcategoría..."
            className="w-full bg-[#0c121e] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category & Status dropdowns */}
        <div className="flex items-center gap-2.5">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0c121e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="comida_rapida">Comida Rápida</option>
            <option value="bebidas_frias">Bebidas Frías</option>
            <option value="cafe_calientes">Café & Calientes</option>
            <option value="combos_sena">Combos SENA</option>
          </select>

          <select
            value={filterStockStatus}
            onChange={(e) => setFilterStockStatus(e.target.value as any)}
            className="bg-[#0c121e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos los Estados</option>
            <option value="normal">Stock Normal</option>
            <option value="alerta">Alerta Amarilla</option>
            <option value="agotados">Agotados (0)</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d1424]/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Producto & Referencia</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Costo (COP)</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-center">Margen</th>
                <th className="py-3 px-4 text-center">Stock Actual</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No se encontraron productos coincidentes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isAgotado = prod.stock === 0 || !!prod.agotado;
                  const isAlerta = prod.stock > 0 && prod.stock <= (prod.alertaStock || 8);
                  const margenBruto = prod.precio > 0 ? Math.round(((prod.precio - prod.costo) / prod.precio) * 100) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Product Name & Pic */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.imagen}
                            alt={prod.nombre}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white group-hover:text-indigo-300 transition-colors block">
                              {prod.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{prod.id}</span>
                            {prod.tag && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {prod.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-slate-300">{prod.categoriaLabel}</span>
                        {prod.subcategoria && (
                          <span className="block text-[10px] text-slate-500">{prod.subcategoria}</span>
                        )}
                      </td>

                      {/* Costo */}
                      <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        ${prod.costo.toLocaleString('es-CO')}
                      </td>

                      {/* Precio */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        ${prod.precio.toLocaleString('es-CO')}
                      </td>

                      {/* Margen */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            margenBruto >= 50
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : margenBruto >= 30
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {margenBruto}%
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-sm font-black font-mono text-white">{prod.stock}</span>
                        <span className="text-[10px] text-slate-500 ml-1">unid.</span>
                      </td>

                      {/* Estado Stock */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isAgotado ? (
                          <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[10px]">
                            Agotado
                          </span>
                        ) : isAlerta ? (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                            Alerta (≤{prod.alertaStock})
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                            Óptimo
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isReadOnly ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Editar producto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar definitivamente "${prod.nombre}" del inventario?`)) {
                                  onDeleteProduct(prod.id);
                                  showToast(`Producto "${prod.nombre}" eliminado.`);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Solo Lectura</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          SECCIÓN INFERIOR: TABLA DE BAJAS (ACTUALIZADA SEMANALMENTE)
          ========================================================= */}
      <div className="glass-panel rounded-2xl p-6 border border-rose-500/20 bg-gradient-to-b from-[#110d18] to-[#0d121f] space-y-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase font-display">
                CONTROL DE MERMAS, AVERÍAS Y VENCIMIENTOS
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-[10px] text-slate-400 font-mono">Registro Diario de Bajas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
              <PackageX className="w-6 h-6 text-rose-400" />
              <span>Tabla de Bajas de Inventario</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Visualización exclusiva de los insumos y productos dados de baja durante la jornada actual ({todayDateStr}).
            </p>
          </div>

          {/* Period Filter Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Filtro:</span>
            <select
              value={bajasFilter}
              onChange={(e) => setBajasFilter(e.target.value)}
              className="bg-[#0c121e] border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-rose-200 focus:outline-none focus:border-rose-400 font-medium cursor-pointer"
            >
              <option value="hoy">Bajas del Día (Hoy)</option>
              <option value="todas">Histórico Completo de Bajas</option>
            </select>
          </div>
        </div>

        {/* Bajas Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                REGISTROS DE BAJA
              </span>
              <span className="text-xl font-extrabold text-white font-display mt-0.5 block">
                {totalBajasCount} <span className="text-xs text-slate-400 font-normal">eventos</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <PackageX className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                UNIDADES DADAS DE BAJA
              </span>
              <span className="text-xl font-extrabold text-rose-400 font-display mt-0.5 block">
                {totalBajasUnidades} <span className="text-xs text-slate-400 font-normal">unidades físicas</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                IMPACTO TOTAL EN COSTO
              </span>
              <span className="text-xl font-extrabold text-white font-display mt-0.5 block">
                ${totalBajasCosto.toLocaleString('es-CO')} <span className="text-xs text-emerald-400">COP</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Bajas Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d1424]/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Semana</th>
                <th className="py-3 px-4">Producto Afectado</th>
                <th className="py-3 px-4 text-center">Cant. Baja</th>
                <th className="py-3 px-4 text-right">Pérdida en Costo</th>
                <th className="py-3 px-4">Motivo de la Baja</th>
                <th className="py-3 px-4">Responsable (Personal)</th>
                <th className="py-3 px-4">Observaciones Técnicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBajas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {bajasFilter === 'hoy'
                      ? 'No hay registros de bajas registradas en el día de hoy.'
                      : 'No hay registros de bajas en el historial.'}
                  </td>
                </tr>
              ) : (
                filteredBajas.map((baja) => (
                  <tr key={baja.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Fecha & Hora */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{baja.fecha}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono pl-5">{baja.hora}</span>
                    </td>

                    {/* Semana */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-indigo-300 border border-white/10">
                        {baja.semana.split(' ')[0]} {baja.semana.split(' ')[1]}
                      </span>
                    </td>

                    {/* Producto */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-white">
                      {baja.productoNombre}
                    </td>

                    {/* Cantidad */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 font-bold font-mono">
                        -{baja.cantidad} u
                      </span>
                    </td>

                    {/* Costo Pérdida */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-300 whitespace-nowrap">
                      -${baja.costoTotal.toLocaleString('es-CO')} COP
                    </td>

                    {/* Motivo */}
                    <td className="py-3 px-4 text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-rose-950/60 text-[10px] font-semibold text-rose-200 border border-rose-500/30">
                        {baja.motivo}
                      </span>
                    </td>

                    {/* Responsable */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{baja.responsable}</span>
                      </div>
                    </td>

                    {/* Observaciones */}
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate" title={baja.observaciones}>
                      {baja.observaciones || 'Sin notas adicionales'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MODAL: DAR DE BAJA PRODUCTO(S)
          ========================================================= */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel-elevated bg-[#0f172a] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-display">
                  FORMULARIO DE MERMA Y DESCARGO DE STOCK
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5 flex items-center gap-2">
                  <PackageX className="w-5 h-5 text-rose-400" />
                  <span>Dar de Baja Insumo / Producto</span>
                </h3>
              </div>
              <button
                onClick={() => setIsBajaModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBaja} className="space-y-4 text-xs">
              {/* Select Product */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Producto a dar de baja *
                </label>
                <select
                  value={bajaProductId}
                  onChange={(e) => {
                    setBajaProductId(e.target.value);
                    setBajaCantidad(1);
                  }}
                  className="w-full bg-[#0c121e] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — Stock actual: {p.stock} u (${p.costo.toLocaleString('es-CO')} COP c/u)
                    </option>
                  ))}
                </select>
              </div>

              {/* Product preview & stock status */}
              {selectedProductForBaja && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedProductForBaja.imagen}
                      alt={selectedProductForBaja.nombre}
                      className="w-9 h-9 rounded-lg object-cover border border-white/10"
                    />
                    <div>
                      <span className="font-bold text-white block">{selectedProductForBaja.nombre}</span>
                      <span className="text-[10px] text-slate-400">
                        Costo unitario: ${selectedProductForBaja.costo.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Stock Disponible</span>
                    <span className="font-mono font-black text-indigo-300">{selectedProductForBaja.stock} u</span>
                  </div>
                </div>
              )}

              {/* Cantidad a dar de baja */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Cantidad a Dar de Baja (Unidades) *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Máx: {selectedProductForBaja?.stock || 0} u
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={selectedProductForBaja?.stock || 1}
                  required
                  value={bajaCantidad}
                  onChange={(e) => setBajaCantidad(Number(e.target.value))}
                  className="w-full bg-[#0c121e] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500 font-mono text-sm"
                />
              </div>

              {/* Motivo de la baja */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  ¿Por qué fue dado de baja? (Motivo Institucional) *
                </label>
                <select
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                  className="w-full bg-[#0c121e] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Fecha de vencimiento caducada">Fecha de vencimiento caducada</option>
                  <option value="Empaque roto / averiado en transporte">Empaque roto / averiado en transporte</option>
                  <option value="Merma de cocción / preparación en cocina">Merma de cocción / preparación en cocina</option>
                  <option value="Ruptura de cadena de frío / descomposición">Ruptura de cadena de frío / descomposición</option>
                  <option value="Contaminación cruzada / no apto para consumo">Contaminación cruzada / no apto para consumo</option>
                  <option value="Fuga o rotura de envase">Fuga o rotura de envase</option>
                  <option value="Otro motivo técnico / auditoría">Otro motivo técnico / auditoría</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observaciones / Justificación adicional
                </label>
                <textarea
                  rows={2}
                  value={bajaObservaciones}
                  onChange={(e) => setBajaObservaciones(e.target.value)}
                  placeholder="Ej: Lote #L2609 recibido con daño mecánico en sellado..."
                  className="w-full bg-[#0c121e] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Calculated Loss Notice */}
              {selectedProductForBaja && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-rose-300">Pérdida calculada al costo:</span>
                  <span className="font-mono font-black text-rose-200 text-sm">
                    ${(bajaCantidad * selectedProductForBaja.costo).toLocaleString('es-CO')} COP
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBajaModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedProductForBaja || selectedProductForBaja.stock === 0}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-display flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <PackageX className="w-4 h-4" />
                  <span>Confirmar Descargo de Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: IMPORTAR INVENTARIO DESDE EXCEL / CSV
          ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel-elevated bg-[#0f172a] border border-indigo-500/30 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-display">
                  CARGA MASIVA DE INVENTARIO
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5 flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-indigo-400" />
                  <span>Importar Inventario desde Excel / CSV</span>
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {/* Step 1: Download Template */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">¿No tienes el formato de columnas?</span>
                  <span className="text-[11px] text-slate-300">
                    Descarga la plantilla oficial con encabezados preconfigurados para Excel.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla</span>
                </button>
              </div>

              {/* Step 2: Upload File Box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Seleccionar Archivo de Excel / CSV *
                </label>
                <div
                  onClick={() => excelInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-indigo-400/50 rounded-2xl p-6 text-center cursor-pointer bg-[#0c121e] hover:bg-[#111827] transition-all"
                >
                  <FileSpreadsheet className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">Haz clic aquí para seleccionar tu archivo Excel o CSV</p>
                  <p className="text-[10px] text-slate-400 mt-1">Soporta archivos .xlsx, .xls y .csv con delimitación estándar</p>
                  {importFileName && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>{importFileName}</span>
                    </div>
                  )}
                </div>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleExcelFileSelect}
                  className="hidden"
                />
              </div>

              {/* Import Error Notice */}
              {importError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Step 3: Preview of parsed products */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      Vista previa de productos detectados ({importPreview.length}):
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Listo para importar</span>
                  </div>
                  <div className="border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#090d16] text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Categoría</th>
                          <th className="p-2 text-right">Precio</th>
                          <th className="p-2 text-right">Costo</th>
                          <th className="p-2 text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-[#0e1626]">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="p-2 text-white font-semibold">{item.nombre}</td>
                            <td className="p-2 text-slate-300">{item.categoria}</td>
                            <td className="p-2 text-right font-mono text-emerald-400">${item.precio?.toLocaleString('es-CO')}</td>
                            <td className="p-2 text-right font-mono text-slate-300">${item.costo?.toLocaleString('es-CO')}</td>
                            <td className="p-2 text-center font-mono text-white font-bold">{item.stock} u</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-display flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                <span>Incorporar {importPreview.length} Productos al Inventario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CREAR / EDITAR PRODUCTO (CON SUBIDA DE IMÁGENES DESDE LOCAL)
          ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel-elevated bg-[#0f172a] border border-white/15 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {editingProduct ? 'MODIFICAR REFERENCIA' : 'ALTA DE PRODUCTO'}
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">
                  {editingProduct ? `Editar: ${editingProduct.nombre}` : 'Nuevo Producto en Catálogo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Product Image Section: DEDICATED LOCAL UPLOAD (NO PRESETS) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fotografía del Producto *
                </label>
                <div className="p-4 rounded-xl bg-[#090e1a] border border-white/10 flex flex-col sm:flex-row items-center gap-4 w-full box-border">
                  {/* Current image preview */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-black/40 shadow-inner flex items-center justify-center">
                    <img
                      src={formData.imagen || assets.empanadas}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 w-full min-w-0 space-y-2.5">
                    {/* Botón para subir imagen desde local */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-100 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <Upload className="w-4 h-4 text-indigo-300 shrink-0" />
                      <span className="truncate">Cargar Imagen desde este Equipo (Local)</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="shrink-0 text-slate-500 font-medium">O enlace directo:</span>
                      <input
                        type="text"
                        value={formData.imagen || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, imagen: e.target.value }))}
                        placeholder="https://ejemplo.com/foto.jpg"
                        className="flex-1 bg-[#060a12] border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-[11px]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Formatos soportados: JPG, PNG, WEBP. La imagen se almacena en la ficha técnica del producto.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Empanada de Carne Santandereana"
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Descripción Corta
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ingredientes, técnica de preparación..."
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Categoría & Subcategoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="comida_rapida">Comida Rápida</option>
                    <option value="bebidas_frias">Bebidas Frías</option>
                    <option value="cafe_calientes">Café & Calientes</option>
                    <option value="combos_sena">Combos SENA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    value={formData.subcategoria}
                    onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                    placeholder="Ej: Fritos, Jugos..."
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Costo, Precio Venta & Calorías */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Costo (COP) *
                  </label>
                  <input
                    type="number"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: Number(e.target.value) })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Precio Venta (COP) *
                  </label>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Calorías (kcal)
                  </label>
                  <input
                    type="number"
                    value={formData.calorias}
                    onChange={(e) => setFormData({ ...formData, calorias: Number(e.target.value) })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Stock Inicial & Alerta Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Stock Inicial (Unidades) *
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Umbral Alerta Mínima
                  </label>
                  <input
                    type="number"
                    value={formData.alertaStock}
                    onChange={(e) => setFormData({ ...formData, alertaStock: Number(e.target.value) })}
                    className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Tag / Badge */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Etiqueta Promocional
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="Ej: RECETA CASERA, HORNO CONTINUO"
                  className="w-full bg-[#0c121e] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
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
                  <span>Guardar en Inventario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

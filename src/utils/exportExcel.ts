import * as XLSX from 'xlsx';
import { BajaItem } from '../types';

/**
 * Excel / CSV Export Utility for Cafetería CGAO SENA
 * Uses SheetJS (XLSX) to produce native multi-sheet .xlsx files and CSV fallback
 */

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const processCell = (cell: string | number) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = '\uFEFF' + rows.map((row) => row.map(processCell).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportSalesItem {
  id: string;
  numeroTurno: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  documento: string;
  ficha: string;
  programa: string;
  metodoPago: string;
  itemsDescripcion: string;
  total: number;
  estado: string;
}

export function exportSalesReport(title: string, data: ExportSalesItem[], period: 'dia' | 'semana_laboral' | 'mes') {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Ventas_CGAO_${period}_${timestamp}.csv`;

  const headers = [
    'ID Venta / Turno',
    'Fecha',
    'Hora',
    'Nombre del Cliente',
    'Documento',
    'Ficha SENA',
    'Programa Formación',
    'Método de Pago',
    'Detalle de Productos',
    'Total Venta (COP)',
    'Estado Transacción',
    'Sede Regional',
  ];

  const rows = [
    [`REPORTE DE VENTAS - CAFETERÍA CENTRO CGAO VÉLEZ - REGIONAL SANTANDER 2026`],
    [`Filtro: ${title}`],
    [`Generado el: ${new Date().toLocaleString('es-CO')}`],
    [],
    headers,
    ...data.map((item) => [
      item.numeroTurno,
      item.fecha,
      item.hora,
      item.clienteNombre,
      item.documento,
      item.ficha,
      item.programa,
      item.metodoPago,
      item.itemsDescripcion,
      item.total,
      item.estado,
      'Centro CGAO Vélez - Regional Santander',
    ]),
  ];

  downloadCSV(filename, rows);
}

export interface ExportInventoryItem {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
  costo: number;
  precio: number;
  stock: number;
  alertaStock: number;
  calorias: number;
  tag: string;
  agotado?: boolean;
}

// Etiquetas de categoría legibles al exportar (formato compatible con la app Flask SENA)
const CATEGORY_LABELS: Record<string, string> = {
  comida_rapida: 'Comida Rápida',
  bebidas_frias: 'Bebidas',
  cafe_calientes: 'Café & Calientes',
  combos_sena: 'Combos',
  reposteria: 'Postres',
  otros: 'Paquetes',
};

/**
 * Exports a multi-sheet Excel (.xlsx) file containing:
 * - Sheet 1: "Inventario Activo" (format compatible with the reference Flask app:
 *   headers Nombre, Precio ($), Costo ($), Stock, Stock Mínimo, Categoría, Subcategoría,
 *   Descripción, Activo + ID, so the file can be re-imported by either system)
 * - Sheet 2: "Bajas y Mermas" (Fecha, Producto, Cantidad, Costo Unitario, Total, Motivo, Responsable)
 */
export function exportInventoryReport(items: ExportInventoryItem[], bajas: BajaItem[] = []) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventario_y_Bajas_CGAO_Velez_${timestamp}.xlsx`;

  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Inventario Activo
    const inventoryHeaders = [
      'ID',
      'Nombre',
      'Precio ($)',
      'Costo ($)',
      'Stock',
      'Stock Mínimo',
      'Categoría',
      'Subcategoría',
      'Descripción',
      'Activo',
    ];

    const totalValorPrecio = items.reduce((acc, it) => acc + it.precio * it.stock, 0);
    const totalValorCosto = items.reduce((acc, it) => acc + it.costo * it.stock, 0);

    const inventoryData = [
      ['INVENTARIO GENERAL - CAFETERÍA CENTRO CGAO VÉLEZ - REGIONAL SANTANDER 2026'],
      [`Fecha de corte: ${new Date().toLocaleString('es-CO')}`],
      [],
      inventoryHeaders,
      ...items.map((item) => [
        item.id,
        item.nombre,
        item.precio,
        item.costo,
        item.stock,
        item.alertaStock,
        CATEGORY_LABELS[item.categoria] || item.categoria,
        item.subcategoria || 'General',
        item.descripcion || '',
        item.stock > 0 && !item.agotado ? 'Sí' : 'No',
      ]),
      [],
      ['TOTAL', '', totalValorPrecio, totalValorCosto, '', '', '', '', '', ''],
    ];

    const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);

    // Auto-fit columns
    wsInventory['!cols'] = [
      { wch: 12 }, // ID
      { wch: 30 }, // Nombre
      { wch: 14 }, // Precio
      { wch: 14 }, // Costo
      { wch: 10 }, // Stock
      { wch: 14 }, // Stock Mínimo
      { wch: 18 }, // Categoría
      { wch: 20 }, // Subcategoría
      { wch: 40 }, // Descripción
      { wch: 10 }, // Activo
    ];

    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventario Activo');

    // Sheet 2: Bajas y Mermas
    const bajasHeaders = [
      'ID Baja',
      'Fecha',
      'Hora',
      'Producto',
      'Cantidad',
      'Costo Unitario',
      'Total',
      'Motivo',
      'Categoría',
      'Responsable',
    ];

    const totalUnidadesBaja = bajas.reduce((acc, b) => acc + b.cantidad, 0);

    const bajasData = [
      ['REGISTRO DE BAJAS Y MERMAS DE INSUMOS - CGAO VÉLEZ 2026'],
      [`Fecha de generación: ${new Date().toLocaleString('es-CO')}`],
      [],
      bajasHeaders,
      ...bajas.map((b) => [
        b.id,
        b.fecha,
        b.hora,
        b.productoNombre,
        b.cantidad,
        b.costoUnitario,
        b.costoTotal,
        b.motivo,
        b.categoria,
        b.responsable,
      ]),
      [],
      ['TOTAL UNIDADES DE BAJA', '', '', '', totalUnidadesBaja, '', '', '', '', ''],
    ];

    const wsBajas = XLSX.utils.aoa_to_sheet(bajasData);
    wsBajas['!cols'] = [
      { wch: 12 }, // ID
      { wch: 12 }, // Fecha
      { wch: 10 }, // Hora
      { wch: 28 }, // Producto
      { wch: 12 }, // Cantidad
      { wch: 16 }, // Costo Unitario
      { wch: 16 }, // Total
      { wch: 40 }, // Motivo
      { wch: 16 }, // Categoría
      { wch: 28 }, // Responsable
    ];

    XLSX.utils.book_append_sheet(wb, wsBajas, 'Bajas y Mermas');

    // Download native multi-sheet Excel file
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Error generating multi-sheet Excel workbook:', err);
    // Fallback to CSV with both sections
    const combinedRows = [
      ['=== HOJA 1: INVENTARIO GENERAL ACTIVO ==='],
      ...items.map((item) => [item.id, item.nombre, item.categoria, item.costo, item.precio, item.stock]),
      [],
      ['=== HOJA 2: REGISTRO DE BAJAS Y MERMAS ==='],
      ...bajas.map((b) => [b.id, b.fecha, b.productoNombre, b.cantidad, b.costoTotal, b.motivo, b.responsable]),
    ];
    downloadCSV(`Inventario_CGAO_${timestamp}.csv`, combinedRows);
  }
}
